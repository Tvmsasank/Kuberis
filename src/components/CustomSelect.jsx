import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

/**
 * Modern, theme-adaptive glassmorphism CustomSelect component.
 * Replaces ugly OS-native <select> boxes with sleek, responsive dropdowns
 * that smoothly transform across Light, Dark, Cyan, and Gold themes.
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
  id = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize options: can be array of strings or array of { value, label, icon?, subtitle? }
  const normalizedOptions = options.map((opt) => {
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

  const selectedOption = normalizedOptions.find((o) => String(o.value) === String(value));

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
      // Support both direct value or synthesized event object: onChange(val) or onChange({ target: { value: val, name } })
      onChange({ target: { value: val, name } });
    }
  };

  const SelectedIcon = selectedOption?.icon;

  const sizeStyles = {
    sm: { height: '34px', fontSize: '12px', padding: '0 10px', iconSize: 13 },
    md: { height: '42px', fontSize: '13px', padding: '0 14px', iconSize: 15 },
    lg: { height: '48px', fontSize: '14.5px', padding: '0 16px', iconSize: 17 }
  }[size] || { height: '42px', fontSize: '13px', padding: '0 14px', iconSize: 15 };

  return (
    <div
      ref={containerRef}
      className={`custom-select-wrapper ${className}`}
      style={{
        position: 'relative',
        width: '100%',
        userSelect: 'none',
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
            zIndex: 9999,
            background: 'var(--bg-card)',
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            border: '1px solid var(--border-glass)',
            borderRadius: '16px',
            boxShadow: '0 20px 48px rgba(0, 0, 0, 0.45), 0 4px 12px rgba(0, 0, 0, 0.15)',
            maxHeight: '260px',
            overflowY: 'auto',
            padding: '6px',
            animation: 'customSelectFadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            ...menuStyle
          }}
        >
          {normalizedOptions.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: '12.5px', color: 'var(--text-muted)', textAlign: 'center' }}>
              No options available
            </div>
          ) : (
            normalizedOptions.map((opt) => {
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
      )}
    </div>
  );
}
