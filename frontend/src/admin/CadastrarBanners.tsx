// src/pages/admin/CadastrarBanners.tsx
import React, { useState, ChangeEvent, FormEvent } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import Button from "../hooks/Button";
import ConfirmDialog from "../hooks/ConfirmDialog";
import {
  useGetBanners,
  useCreateBanner,
  useDeleteBanner,
  useDeleteBannerImage,
  useDeleteAllBanners,
} from "../hooks/Banners/useBanners";

function CadastrarBanners() {
  const [bannerName, setBannerName] = useState("");
  const [bannerImages, setBannerImages] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);
  const [confirmTitle, setConfirmTitle] = useState("Confirmação");
  const [confirmMessage, setConfirmMessage] = useState(
    "Tem certeza que deseja continuar? Essa ação não pode ser desfeita."
  );

  const { data: banners = [], isLoading } = useGetBanners();
  const createBanner = useCreateBanner();
  const deleteBanner = useDeleteBanner();
  const deleteImage = useDeleteBannerImage();
  const deleteAllBanners = useDeleteAllBanners();

  const showMessage = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(""), 3000);
  };

  const abrirModalConfirmacao = (
    action: () => void,
    title = "Confirmação",
    message = "Tem certeza que deseja continuar?"
  ) => {
    setConfirmAction(() => action);
    setConfirmTitle(title);
    setConfirmMessage(message);
    setShowConfirm(true);
  };

  const fecharModalConfirmacao = () => setShowConfirm(false);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setBannerImages(Array.from(e.target.files));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (bannerImages.length === 0) {
      showMessage("Selecione pelo menos uma imagem.");
      return;
    }

    const formData = new FormData();
    formData.append("bannerName", bannerName);
    bannerImages.forEach((image) => formData.append("bannerImages[]", image));

    createBanner.mutate(formData, {
      onSuccess: () => {
        showMessage("Banners cadastrados com sucesso!");
        setBannerName("");
        setBannerImages([]);
      },
      onError: () => showMessage("Erro ao cadastrar banners."),
    });
  };

  const handleDeleteImage = (bannerId: number, imageUrl: string) => {
    abrirModalConfirmacao(() =>
      deleteImage.mutate(
        { bannerId, imageUrl },
        { onSuccess: () => showMessage("Imagem excluída com sucesso!") }
      )
    );
  };

  const handleDeleteBanner = (bannerId: number) => {
    abrirModalConfirmacao(() =>
      deleteBanner.mutate(bannerId, {
        onSuccess: () => showMessage("Banner excluído!"),
      })
    );
  };

  const handleDeleteTodosBanners = () => {
    abrirModalConfirmacao(() =>
      deleteAllBanners.mutate(banners, {
        onSuccess: () => showMessage("Todos os banners foram excluídos!"),
      })
    );
  };

  if (isLoading) return <p>Carregando banners...</p>;

  return (
    <div className="container mt-5 shadow p-3 mb-5 bg-body rounded">
      <h2>Cadastrar Novos Banners</h2>
      {message && <div className="alert alert-info">{message}</div>}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="bannerName" className="form-label">
            Nome do Banner
          </label>
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
          <label htmlFor="bannerImages" className="form-label">
            Imagens do Banner
          </label>
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

        <button
          type="submit"
          className="btn btn-primary"
          disabled={createBanner.isPending}
        >
          {createBanner.isPending ? "Cadastrando..." : "Cadastrar Banners"}
        </button>
      </form>

      <h2 className="mt-5">Gerenciar Banners</h2>

      {banners.length === 0 ? (
        <p>Nenhum banner cadastrado.</p>
      ) : (
        <>
          {banners.map((banner) => {
            const imageUrls = JSON.parse(banner.image_urls || "[]");
            return (
              <div key={banner.id} className="mb-4">
                <div className="d-flex flex-wrap">
                  {imageUrls.map((url: string, index: number) => (
                    <div key={`${banner.id}-${index}`} className="m-2">
                      <img
                        src={`http://localhost:8000/storage/${url}`}
                        alt={`Banner ${index}`}
                        style={{
                          width: "200px",
                          height: "200px",
                          objectFit: "cover",
                        }}
                      />
                      <button
                        className="btn btn-danger mt-2"
                        onClick={() => handleDeleteImage(banner.id, url)}
                      >
                        Excluir Imagem
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  className="btn btn-warning mt-2"
                  onClick={() => handleDeleteBanner(banner.id)}
                >
                  Excluir Banner
                </button>

                <hr />
              </div>
            );
          })}

          <div className="d-flex justify-content-between mt-4">
            <Button label="Voltar para Dashboard" to="/admin/dashboard" />
            <button
              className="btn btn-danger ml-3"
              onClick={handleDeleteTodosBanners}
            >
              Excluir Todos os Banners
            </button>
          </div>
        </>
      )}

      <ConfirmDialog
        show={showConfirm}
        title={confirmTitle}
        message={confirmMessage}
        onConfirm={() => {
          if (confirmAction) confirmAction();
          fecharModalConfirmacao();
        }}
        onCancel={fecharModalConfirmacao}
      />
    </div>
  );
}

export default CadastrarBanners;
