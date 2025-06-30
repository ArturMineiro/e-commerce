// CadastrarBanners.tsx
import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import Button from '../hooks/Button';
import api from '../config/axiosConfig';
import ConfirmDialog from '../hooks/ConfirmDialog';

function CadastrarBanners() {
  const [bannerName, setBannerName] = useState<string>('');
  const [bannerImages, setBannerImages] = useState<File[]>([]);
  const [message, setMessage] = useState<string>('');
  const [banners, setBanners] = useState<any[]>([]); // Banners existentes

  // Controle do modal de confirmação
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState<string>('Confirmação');
  const [confirmMessage, setConfirmMessage] = useState<string>('Tem certeza que deseja continuar? Essa ação não pode ser desfeita.');

  // Exibe mensagem temporária
  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  // Funções para abrir e fechar o modal com ação e mensagens customizadas
  const abrirModalConfirmacao = (
    action: () => void,
    title = 'Confirmação',
    message = 'Tem certeza que deseja continuar? Essa ação não pode ser desfeita.'
  ) => {
    setConfirmAction(() => action);
    setConfirmTitle(title);
    setConfirmMessage(message);
    setShowConfirm(true);
  };
  const fecharModalConfirmacao = () => setShowConfirm(false);

  // Carregar banners no início
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await api.get('/banners');
        setBanners(response.data);
      } catch (error) {
        showMessage('Erro ao carregar os banners.');
      }
    };
    fetchBanners();
  }, []);

  // Selecionar imagens
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setBannerImages(Array.from(e.target.files));
    }
  };

  // Submeter novo banner
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (bannerImages.length === 0) {
      showMessage('Selecione pelo menos uma imagem para o banner.');
      return;
    }

    const formData = new FormData();
    formData.append('bannerName', bannerName);
    bannerImages.forEach(image => formData.append('bannerImages[]', image));

    try {
      await api.post('/cadastrar-banners', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showMessage('Banners cadastrados com sucesso!');
      setBannerName('');
      setBannerImages([]);
      // Recarrega banners
      const response = await api.get('/banners');
      setBanners(response.data);
    } catch (error: any) {
      if (error.response) {
        showMessage(`Erro ao cadastrar banners: ${error.response.data.message}`);
      } else {
        showMessage('Erro ao cadastrar banners.');
      }
    }
  };

  // Excluir imagem específica
  const handleDeleteImage = async (bannerId: number, imageUrl: string) => {
    try {
      await api.post(`/banners/${bannerId}/delete-image`, { imageUrl }, {
        headers: { 'Content-Type': 'application/json' },
      });
      showMessage('Imagem excluída com sucesso!');
      const response = await api.get('/banners');
      setBanners(response.data);
    } catch {
      showMessage('Erro ao excluir a imagem. Tente novamente.');
    } finally {
      fecharModalConfirmacao();
    }
  };

  // Excluir banner individual
  const handleDeleteBanner = async (bannerId: number) => {
    try {
      await api.delete(`/banners/${bannerId}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      showMessage('Banner excluído com sucesso!');
      setBanners(banners.filter(banner => banner.id !== bannerId));
    } catch {
      showMessage('Erro ao excluir o banner. Tente novamente.');
    } finally {
      fecharModalConfirmacao();
    }
  };

  // Excluir todos os banners
  const handleDeleteTodosBanners = async () => {
    try {
      for (const banner of banners) {
        await api.delete(`/banners/${banner.id}`);
      }
      showMessage('Todos os banners foram excluídos com sucesso!');
      setBanners([]);
    } catch {
      showMessage('Erro ao excluir todos os banners.');
    } finally {
      fecharModalConfirmacao();
    }
  };

  return (
    <div className="container mt-5 shadow p-3 mb-5 bg-body rounded">
      <h2>Cadastrar Novos Banners</h2>

      {message && <div className="alert alert-info">{message}</div>}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="bannerName" className="form-label">Nome do Banner</label>
          <input
            type="text"
            className="form-control"
            id="bannerName"
            value={bannerName}
            onChange={(e) => setBannerName(e.target.value)}
            required
          />
        </div>

        <div className="mb-3">
          <label htmlFor="bannerImages" className="form-label">Imagens do Banner</label>
          <input
            type="file"
            className="form-control"
            id="bannerImages"
            multiple
            accept="image/*"
            onChange={handleImageChange}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary">Cadastrar Banners</button>
      </form>

      <h2 className="mt-5">Gerenciar Banners</h2>

      {banners.length === 0 ? (
        <p>Nenhum banner cadastrado.</p>
      ) : (
        <>
          {banners.map((banner) => {
            const imageUrls = JSON.parse(banner.image_urls);
            return (
              <div key={banner.id} className="mb-4">
                <div className="d-flex flex-wrap">
                  {imageUrls.map((url: string, index: number) => (
                    <div key={`${banner.id}-${index}`} className="m-2">
                      <img
                        className="d-block w-100"
                        src={`http://localhost:8000/storage/${url}`}
                        alt={`Banner ${index}`}
                        style={{ width: '200px', height: '200px', objectFit: 'cover' }}
                      />
                      <button
                        className="btn btn-danger mt-2"
                        onClick={() =>
                          abrirModalConfirmacao(
                            () => handleDeleteImage(banner.id, url),
                            'Excluir Imagem',
                            'Tem certeza que deseja excluir esta imagem?'
                          )
                        }
                      >
                        Excluir Imagem
                      </button>
                    </div>
                  ))}
                </div>

                
                <hr />
              </div>
            );
          })}

          <div className="d-flex justify-content-between mt-4">
            <Button label="Voltar para Dashboard" to="/admin/dashboard" />
            <button
              className="btn btn-danger ml-3"
              onClick={() =>
                abrirModalConfirmacao(
                  handleDeleteTodosBanners,
                  'Excluir Todos os Banners',
                  'Tem certeza que deseja excluir todos os banners? Essa ação não pode ser desfeita.'
                )
              }
            >
              Excluir Todos os Banners
            </button>
          </div>
        </>
      )}

      {/* Modal de confirmação genérico */}
      <ConfirmDialog
        show={showConfirm}
        title={confirmTitle}
        message={confirmMessage}
        onConfirm={() => {
          if (confirmAction) confirmAction();
        }}
        onCancel={fecharModalConfirmacao}
      />
    </div>
  );
}

export default CadastrarBanners;
