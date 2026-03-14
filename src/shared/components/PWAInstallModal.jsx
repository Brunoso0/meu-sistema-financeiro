import React from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';

export default function PWAInstallModal({ isIOSDevice, onInstall, onDismiss }) {
  return (
    <div className="pwa-sheet-backdrop" role="dialog" aria-modal="true" aria-label="Instalar aplicativo">
      <div className="pwa-sheet">
        <button
          type="button"
          className="pwa-sheet-close"
          onClick={() => onDismiss(false)}
          aria-label="Fechar"
        >
          <X size={18} />
        </button>

        <div className="pwa-sheet-icon">
          <Smartphone size={32} />
        </div>

        <div className="pwa-sheet-body">
          <h3>Instalar RendaSys</h3>
          <p>
            Adicione o app à sua tela inicial para acessar rapidamente, sem precisar abrir o navegador.
          </p>

          {isIOSDevice ? (
            <div className="pwa-ios-steps">
              <div className="pwa-ios-step">
                <Share size={16} />
                <span>Toque em <strong>Compartilhar</strong> na barra do Safari</span>
              </div>
              <div className="pwa-ios-step">
                <Download size={16} />
                <span>Selecione <strong>Adicionar à Tela de Início</strong></span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="pwa-sheet-actions">
          {!isIOSDevice && (
            <button type="button" className="clar-primary-btn" onClick={onInstall}>
              <Download size={16} />
              Instalar app
            </button>
          )}
          <button
            type="button"
            className="clar-secondary-btn"
            onClick={() => onDismiss(true)}
          >
            Não mostrar novamente
          </button>
        </div>
      </div>
    </div>
  );
}
