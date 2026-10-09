import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Sliders,
  X,
  RotateCcw,
  Eye,
  Sun,
  Moon,
  Layers,
  Droplets,
  Check
} from 'lucide-react';

export const DEFAULT_GLASS_CONFIG = {
  opacity: 72,       // 20% to 95%
  blur: 26,          // 8px to 45px
  specular: true,    // Rim highlight
  ambientOrbs: true, // Background floating liquid light
  preset: 'emerald'  // 'vision' | 'emerald' | 'obsidian' | 'pearl'
};

export const PRESETS = [
  { id: 'vision', name: 'Apple Vision', opacity: 58, blur: 30, specular: true, icon: '🫧' },
  { id: 'emerald', name: 'Cyber Emerald', opacity: 72, blur: 26, specular: true, icon: '🍏' },
  { id: 'obsidian', name: 'Obsidian Ice', opacity: 88, blur: 34, specular: true, icon: '💎' },
  { id: 'pearl', name: 'Pearlescent', opacity: 75, blur: 22, specular: true, icon: '⚪' }
];

export function applyGlassConfig(config) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const alpha = Number((config.opacity / 100).toFixed(2));
  const sidebarAlpha = Math.min(0.96, Number((alpha + 0.12).toFixed(2)));

  // 1. Update CSS variables for blur, opacity and specular highlights
  root.style.setProperty('--glass-blur', `${config.blur}px`);
  root.style.setProperty('--glass-opacity', `${alpha}`);
  root.style.setProperty('--glass-sidebar-opacity', `${sidebarAlpha}`);
  root.style.setProperty('--glass-specular-opacity', config.specular ? '0.45' : '0.0');

  // 2. Set dynamic inline stylesheet with dual theme rules so light & dark both apply flawlessly
  let dynamicStyleEl = document.getElementById('kuberis-dynamic-liquid-glass-style');
  if (!dynamicStyleEl) {
    dynamicStyleEl = document.createElement('style');
    dynamicStyleEl.id = 'kuberis-dynamic-liquid-glass-style';
    document.head.appendChild(dynamicStyleEl);
  }

  const lightAlpha = Math.max(0.65, alpha);
  const lightSidebarAlpha = Math.max(0.78, sidebarAlpha);
  const lightHeroAlpha = Math.min(0.85, alpha);

  dynamicStyleEl.textContent = `
    /* Apple Liquid Glass: Dark / Cyber Emerald Theme Engine */
    :root, [data-theme='dark'], [data-theme='emerald'] {
      --bg-card: rgba(10, 25, 47, ${alpha}) !important;
      --bg-sidebar: rgba(8, 18, 35, ${sidebarAlpha}) !important;
      --hero-bg: linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(10, 25, 47, ${alpha}) 100%) !important;
      --glass-blur: ${config.blur}px !important;
      --glass-opacity: ${alpha} !important;
      --glass-sidebar-opacity: ${sidebarAlpha} !important;
      --glass-specular-opacity: ${config.specular ? '0.45' : '0.0'} !important;
      --bg-glass-subtle: rgba(255, 255, 255, 0.05) !important;
      --border-glass-subtle: rgba(255, 255, 255, 0.1) !important;
    }

    /* Apple Liquid Glass: Clean Light Theme Engine */
    [data-theme='light'] {
      --bg-card: rgba(255, 255, 255, ${lightAlpha}) !important;
      --bg-sidebar: rgba(255, 255, 255, ${lightSidebarAlpha}) !important;
      --hero-bg: linear-gradient(135deg, rgba(236, 253, 245, ${lightHeroAlpha}) 0%, rgba(240, 253, 244, ${Math.min(0.75, lightHeroAlpha)}) 50%, rgba(224, 242, 254, ${lightHeroAlpha}) 100%) !important;
      --glass-blur: ${config.blur}px !important;
      --glass-opacity: ${alpha} !important;
      --glass-sidebar-opacity: ${sidebarAlpha} !important;
      --glass-specular-opacity: ${config.specular ? '0.5' : '0.0'} !important;
      --bg-glass-subtle: rgba(15, 23, 42, 0.04) !important;
      --border-glass-subtle: rgba(226, 232, 240, 0.85) !important;
    }

    /* Common refraction on all glass surfaces */
    .card, .sidebar, .card-table, .modal-content {
      backdrop-filter: blur(${config.blur}px) saturate(190%) !important;
      -webkit-backdrop-filter: blur(${config.blur}px) saturate(190%) !important;
    }

    /* Dark Mode Glass Cards & Modals */
    :root:not([data-theme='light']) .card,
    :root:not([data-theme='light']) .sidebar,
    :root:not([data-theme='light']) .card-table,
    [data-theme='dark'] .card,
    [data-theme='dark'] .sidebar,
    [data-theme='dark'] .card-table,
    [data-theme='emerald'] .card,
    [data-theme='emerald'] .sidebar,
    [data-theme='emerald'] .card-table {
      background: rgba(10, 25, 47, ${alpha}) !important;
      border-color: rgba(255, 255, 255, ${config.specular ? '0.14' : '0.06'}) !important;
      box-shadow: inset 0 1px 1px rgba(255, 255, 255, ${config.specular ? '0.35' : '0.0'}), 0 12px 32px -4px rgba(0, 0, 0, 0.5) !important;
    }

    :root:not([data-theme='light']) .modal-content,
    [data-theme='dark'] .modal-content,
    [data-theme='emerald'] .modal-content {
      background: rgba(10, 25, 47, ${alpha}) !important;
      border-color: rgba(255, 255, 255, ${config.specular ? '0.18' : '0.08'}) !important;
      box-shadow: inset 0 1px 1.5px rgba(255, 255, 255, ${config.specular ? '0.45' : '0.0'}), 0 24px 60px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(16, 185, 129, 0.12) !important;
      color: #FFFFFF !important;
    }

    /* Light Mode Glass Cards & Modals */
    [data-theme='light'] .card,
    [data-theme='light'] .sidebar,
    [data-theme='light'] .card-table {
      background: rgba(255, 255, 255, ${lightAlpha}) !important;
      border-color: rgba(226, 232, 240, 0.85) !important;
      box-shadow: inset 0 1px 1.5px rgba(255, 255, 255, ${config.specular ? '0.9' : '0.0'}), 0 12px 28px rgba(15, 23, 42, 0.08) !important;
    }

    [data-theme='light'] .modal-content {
      background: rgba(255, 255, 255, ${lightAlpha}) !important;
      border-color: rgba(255, 255, 255, 0.9) !important;
      box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.95), 0 24px 50px -12px rgba(15, 23, 42, 0.15) !important;
      color: #0F172A !important;
    }
  `;

  // Toggle ambient orbs
  const orbContainer = document.getElementById('kuberis-ambient-liquid-orbs');
  if (orbContainer) {
    orbContainer.style.display = config.ambientOrbs ? 'block' : 'none';
  }
}

export default function LiquidGlassController({ isOpen, onClose }) {
  const [config, setConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('kuberis_liquid_glass');
      return saved ? { ...DEFAULT_GLASS_CONFIG, ...JSON.parse(saved) } : DEFAULT_GLASS_CONFIG;
    } catch (e) {
      return DEFAULT_GLASS_CONFIG;
    }
  });

  useEffect(() => {
    applyGlassConfig(config);
    try {
      localStorage.setItem('kuberis_liquid_glass', JSON.stringify(config));
    } catch (e) {}
  }, [config]);

  const handleUpdate = (key, val) => {
    setConfig(prev => {
      const next = { ...prev, [key]: val, preset: 'custom' };
      applyGlassConfig(next);
      return next;
    });
  };

  const handleSelectPreset = (p) => {
    setConfig(prev => {
      const next = {
        ...prev,
        opacity: p.opacity,
        blur: p.blur,
        specular: p.specular,
        preset: p.id
      };
      applyGlassConfig(next);
      return next;
    });
  };

  const handleReset = () => {
    setConfig(DEFAULT_GLASS_CONFIG);
    applyGlassConfig(DEFAULT_GLASS_CONFIG);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          style={{ zIndex: 10050, backdropFilter: 'blur(4px)', background: 'rgba(0, 0, 0, 0.28)' }}
        >
          <motion.div
            className="modal-content"
            initial={{ scale: 0.92, opacity: 0, y: 15 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 15 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '460px',
              width: '100%',
              padding: '28px',
              borderRadius: '26px',
              border: '1px solid var(--border-glass)',
              boxShadow: '0 30px 90px -20px rgba(0,0,0,0.8), 0 0 50px -10px rgba(16, 185, 129, 0.2)'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '12px',
                    background: 'rgba(16, 185, 129, 0.15)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    color: '#10B981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Droplets size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: 'var(--text-main)', letterSpacing: '-0.3px' }}>
                    Apple Liquid Glass Engine
                  </h3>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    Real-time material translucency & refraction
                  </div>
                </div>
              </div>
              <button className="modal-close" onClick={onClose} aria-label="Close" style={{ padding: '6px' }}>
                <X size={18} />
              </button>
            </div>

            {/* Live Interactive Glass Preview Tile */}
            <div
              style={{
                position: 'relative',
                height: '110px',
                borderRadius: '18px',
                overflow: 'hidden',
                marginBottom: '22px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(135deg, #059669 0%, #0F172A 50%, #3B82F6 100%)'
              }}
            >
              {/* Internal Floating Bokeh Orb */}
              <div
                style={{
                  position: 'absolute',
                  width: '90px',
                  height: '90px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, #FBBF24 0%, transparent 70%)',
                  top: '10px',
                  left: '25%'
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, #EC4899 0%, transparent 70%)',
                  bottom: '5px',
                  right: '25%'
                }}
              />

              {/* Floating Glass Tile inside */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  padding: '12px 24px',
                  borderRadius: '16px',
                  background: document.documentElement.getAttribute('data-theme') === 'light' ? `rgba(255, 255, 255, ${config.opacity / 100})` : `rgba(10, 25, 47, ${config.opacity / 100})`,
                  backdropFilter: `blur(${config.blur}px) saturate(190%)`,
                  WebkitBackdropFilter: `blur(${config.blur}px) saturate(190%)`,
                  border: config.specular ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: config.specular
                    ? 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.5), 0 12px 30px rgba(0, 0, 0, 0.5)'
                    : '0 12px 30px rgba(0, 0, 0, 0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                <Sparkles size={16} style={{ color: 'var(--primary)' }} />
                <span style={{ fontSize: '13px', fontWeight: '800', color: document.documentElement.getAttribute('data-theme') === 'light' ? '#0F172A' : '#FFFFFF' }}>
                  Live Glass Refraction
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '6px',
                    background: 'rgba(16, 185, 129, 0.25)',
                    color: '#34D399',
                    fontWeight: '800'
                  }}
                >
                  {config.opacity}%
                </span>
              </div>
            </div>

            {/* Presets Grid */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontSize: '11px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                Apple Material Presets
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {PRESETS.map((p) => {
                  const isSelected = config.preset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleSelectPreset(p)}
                      style={{
                        padding: '10px 6px',
                        borderRadius: '12px',
                        border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border-color)',
                        background: isSelected ? 'var(--primary-light)' : 'rgba(255, 255, 255, 0.04)',
                        color: isSelected ? 'var(--primary)' : 'var(--text-main)',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <span style={{ fontSize: '16px' }}>{p.icon}</span>
                      <span style={{ whiteSpace: 'nowrap' }}>{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Controls Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '22px' }}>
              {/* Opacity Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Layers size={14} style={{ color: 'var(--primary)' }} /> Glass Translucency
                  </label>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary)' }}>
                    {config.opacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min="25"
                  max="95"
                  value={config.opacity}
                  onChange={(e) => handleUpdate('opacity', Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  <span>Crystal Clear (25%)</span>
                  <span>Frosted Satin (95%)</span>
                </div>
              </div>

              {/* Blur Radius Slider */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Droplets size={14} style={{ color: '#38BDF8' }} /> Frost Blur Radius
                  </label>
                  <span style={{ fontSize: '12px', fontWeight: '800', color: '#38BDF8' }}>
                    {config.blur}px
                  </span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="45"
                  value={config.blur}
                  onChange={(e) => handleUpdate('blur', Number(e.target.value))}
                  style={{ width: '100%', accentColor: '#38BDF8', cursor: 'pointer' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  <span>Subtle (8px)</span>
                  <span>Deep Blur (45px)</span>
                </div>
              </div>

              {/* Toggles */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-color)',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    color: 'var(--text-main)'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={config.specular}
                    onChange={(e) => handleUpdate('specular', e.target.checked)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  Specular Rim Sheen
                </label>

                <label
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-color)',
                    fontSize: '11.5px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    color: 'var(--text-main)'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={config.ambientOrbs}
                    onChange={(e) => handleUpdate('ambientOrbs', e.target.checked)}
                    style={{ accentColor: 'var(--primary)' }}
                  />
                  Dynamic Light Orbs
                </label>
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={handleReset}
                style={{ fontSize: '11.5px', gap: '4px', color: 'var(--text-muted)' }}
              >
                <RotateCcw size={13} /> Reset Defaults
              </button>

              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={onClose}
                style={{ fontSize: '12px', padding: '7px 20px', borderRadius: '10px', fontWeight: '800' }}
              >
                Apply & Save
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
