import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Carousel } from 'react-bootstrap';
import './adminStyles.css';
import Button from '../hooks/Button';

function CadastrarBanners() {
    const [bannerName, setBannerName] = useState<string>('');
    const [bannerImages, setBannerImages] = useState<File[]>([]);
    const [message, setMessage] = useState<string>('');
    const [banners, setBanners] = useState<any[]>([]); // Para armazenar banners existentes

    // Função para exibir mensagens temporariamente
    const showMessage = (msg: string) => {
        setMessage(msg);
        setTimeout(() => {
            setMessage(''); // Limpa a mensagem após 3 segundos
        }, 3000);
    };

    // Carregar banners existentes
    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const response = await axios.get('http://localhost:8000/api/banners');
                setBanners(response.data);
            } catch (error) {
                showMessage('Erro ao carregar os banners.');
            }
        };

        fetchBanners();
    }, []);

    // Handle change for selecting images
    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setBannerImages(Array.from(e.target.files));
        }
    };

    // Handle banner submission
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (bannerImages.length === 0) {
            showMessage('Selecione pelo menos uma imagem para o banner.');
            return;
        }

        const formData = new FormData();
        formData.append('bannerName', bannerName);
        bannerImages.forEach((image) => {
            formData.append('bannerImages[]', image); 
        });

        try {
            await axios.post('http://localhost:8000/api/cadastrar-banners', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            showMessage('Banners cadastrados com sucesso!');
            setBannerName('');
            setBannerImages([]);
        } catch (error) {
            if (error.response) {
                showMessage(`Erro ao cadastrar banners: ${error.response.data.message}`);
            } else {
                showMessage('Erro ao cadastrar banners.');
            }
        }
    }        
    
    // Função para excluir uma imagem individualmente
    const handleDeleteImage = async (bannerId: number, imageUrl: string) => {
        try {
            await axios.post(`http://localhost:8000/api/banners/${bannerId}/delete-image`, {
                imageUrl,
            }, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            showMessage('Imagem excluída com sucesso!');
            // Atualiza a lista de banners após excluir a imagem
            const response = await axios.get('http://localhost:8000/api/banners');
            setBanners(response.data);
        } catch (error) {
            showMessage('Erro ao excluir a imagem. Tente novamente.');
        }
    };

    // Função para excluir um banner inteiro
    const handleDeleteBanner = async (bannerId: number) => {
        try {
            await axios.delete(`http://localhost:8000/api/banners/${bannerId}`, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            showMessage('Banner excluído com sucesso!');
            // Atualiza a lista de banners após excluir
            setBanners(banners.filter(banner => banner.id !== bannerId));
        } catch (error) {
            showMessage('Erro ao excluir o banner. Tente novamente.');
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
                            <div key={banner.id}>  
                                <div className="d-flex">
                                    {imageUrls.map((url: string, index: number) => (
                                        <div key={`${banner.id}-${index}`} className="m-2">
                                            <img
                                                className="d-block w-100"
                                                src={`http://localhost:8000/storage/${url}`}
                                                alt={`Banner ${index}`}
                                                style={{ width: '200px', height:'200px' }}
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
                                                className="btn btn-danger mt-2"
                                                onClick={() => handleDeleteBanner(banner.id)}
                                            >
                                                Excluir Banner completo
                                            </button>
                                <div className="mr-4 mt-3 mb-3 d-flex justify-content-end"> 
      <Button label="Voltar para Dashboard" to="/admin/dashboard" />
      </div>
                            </div>
                        );
                    })}
                </>
            )}
        </div>
    );
}

export default CadastrarBanners;
