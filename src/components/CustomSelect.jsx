import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

/**
 * Modern, theme-adaptive glassmorphism CustomSelect component.
 * Features in-dropdown instant search bar, solid opaque contrast popover,
 * and smooth keyboard/mouse interactions.
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option...',
  disabled = false,
  className = '',
  style = {},
  buttonStyle = {},
  menuStyle = {},
  size = 'md', // 'sm' | 'md' | 'lg'
  icon: PrefixIcon = null,
  name = '',
  id = '',
  searchable = true
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Normalize options: can be array of strings or array of { value, label, icon?, subtitle? }
  const normalizedOptions = useMemo(() => {
    return options.map((opt) => {
      if (typeof opt === 'object' && opt !== null) {
        return {
          value: opt.value !== undefined ? String(opt.value) : '',
          label: opt.label !== undefined ? opt.label : String(opt.value),
          icon: opt.icon || null,
          subtitle: opt.subtitle || null
        };
      }
      return {
        value: String(opt),
        label: String(opt),
        icon: null,
        subtitle: null
      };
    });
  }, [options]);

  const selectedOption = normalizedOptions.find((o) => String(o.value) === String(value));

  // Filter options by search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return normalizedOptions;
    const q = searchQuery.toLowerCase().trim();
    return normalizedOptions.filter((opt) => {
      const labelMatch = (opt.label || '').toLowerCase().includes(q);
      const subMatch = (opt.subtitle || '').toLowerCase().includes(q);
      const valMatch = (opt.value || '').toLowerCase().includes(q);
      return labelMatch || subMatch || valMatch;
    });
  }, [normalizedOptions, searchQuery]);

  // Focus search input when menu opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (val) => {
    if (disabled) return;
    setIsOpen(false);
    if (onChange) {
      onChange({ target: { value: val, name } });
    }
  };

  const SelectedIcon = selectedOption?.icon;

  const sizeStyles = {
    sm: { height: '36px', fontSize: '12.5px', padding: '0 12px', iconSize: 13.5 },
    md: { height: '38px', fontSize: '13px', padding: '0 13px', iconSize: 15 },
    lg: { height: '46px', fontSize: '14px', padding: '0 16px', iconSize: 16 }
  }[size] || { height: '38px', fontSize: '13px', padding: '0 13px', iconSize: 15 };

  const isSearchEnabled = searchable && normalizedOptions.length >= 4;

  return (
    <div
      ref={containerRef}
      className={`custom-select-wrapper ${isOpen ? 'is-open' : ''} ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        userSelect: 'none',
        zIndex: isOpen ? 1000 : 'auto',
        ...style
      }}
      id={id}
    >
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className="custom-select-trigger"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card)',
          color: selectedOption ? 'var(--text-main)' : 'var(--text-muted)',
          border: isOpen ? '1px solid var(--border-focus)' : '1px solid var(--border-color)',
          boxShadow: isOpen ? '0 0 0 3px var(--primary-light)' : 'none',
          borderRadius: 'var(--radius-md)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          transition: 'all var(--transition-fast)',
          outline: 'none',
          textAlign: 'left',
          gap: '8px',
          ...sizeStyles,
          ...buttonStyle
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
          {PrefixIcon && (
            <PrefixIcon size={sizeStyles.iconSize} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          )}
          {SelectedIcon && (
            <SelectedIcon size={sizeStyles.iconSize} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          )}
          <span
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontWeight: selectedOption ? '600' : '400'
            }}
          >
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          size={14}
          style={{
            color: 'var(--text-muted)',
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.22s var(--ease-smooth)'
          }}
        />
      </button>

      {/* Floating Popover Dropdown Menu */}
      {isOpen && (
        <div
          className="custom-select-menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 10050,
            background: typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light' ? '#FFFFFF' : '#0B192C',
            border: typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light' ? '1px solid rgba(203, 213, 225, 0.95)' : '1px solid rgba(16, 185, 129, 0.35)',
            borderRadius: '16px',
            boxShadow: typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'light'
              ? '0 20px 48px rgba(15, 23, 42, 0.18), 0 4px 12px rgba(15, 23, 42, 0.08)'
              : '0 24px 55px rgba(0, 0, 0, 0.9), 0 4px 16px rgba(0, 0, 0, 0.6)',
            maxHeight: '300px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '6px',
            animation: 'customSelectFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            ...menuStyle
          }}
        >
          {/* In-Menu Search Input */}
          {isSearchEnabled && (
            <div
              style={{
                position: 'relative',
                padding: '4px 6px 8px 6px',
                borderBottom: '1px solid var(--border-color)',
                marginBottom: '4px',
                flexShrink: 0
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '13px',
                  color: 'var(--text-muted)'
                }}
              />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search or scroll options..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: '32px',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  paddingLeft: '32px',
                  paddingRight: searchQuery ? '28px' : '10px',
                  fontSize: '12px',
                  color: 'var(--text-main)',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '11px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px'
                  }}
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}

          {/* Scrollable Options List */}
          <div
            style={{
              overflowY: 'auto',
              flex: 1,
              maxHeight: '240px'
            }}
          >
            {filteredOptions.length === 0 ? (
              <div style={{ padding: '16px 14px', fontSize: '12.5px', color: 'var(--text-muted)', textAlign: 'center' }}>
                No matching options found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                const OptIcon = opt.icon;

                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className="custom-select-option"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '9px 12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      fontSize: sizeStyles.fontSize,
                      fontWeight: isSelected ? '700' : '500',
                      color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                      background: isSelected ? 'var(--primary-light)' : 'transparent',
                      transition: 'all 0.12s ease',
                      marginBottom: '2px',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'var(--bg-card-hover)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                      {OptIcon && (
                        <OptIcon
                          size={14}
                          style={{
                            color: isSelected ? 'var(--primary)' : 'var(--text-muted)',
                            flexShrink: 0
                          }}
                        />
                      )}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {opt.label}
                        </div>
                        {opt.subtitle && (
                          <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
                            {opt.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <Check size={14} style={{ color: 'var(--primary)', flexShrink: 0 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

