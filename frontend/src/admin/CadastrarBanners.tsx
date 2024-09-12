import React, { useState, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';

function CadastrarBanners() {
    const [bannerName, setBannerName] = useState<string>('');
    const [bannerImages, setBannerImages] = useState<File[]>([]);
    const [message, setMessage] = useState<string>('');

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setBannerImages(Array.from(e.target.files));
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (bannerImages.length === 0) {
            setMessage('Selecione pelo menos uma imagem para o banner.');
            return;
        }

        const formData = new FormData();
        formData.append('bannerName', bannerName);
        bannerImages.forEach((image) => {
            formData.append('bannerImages[]', image);
        });

        try {
            await axios.post('http://localhost:8000/api/banners', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setMessage('Banners cadastrados com sucesso!');
            setBannerName('');
            setBannerImages([]);
        } catch (error) {
            setMessage('Erro ao cadastrar os banners. Tente novamente.');
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
                        onChange={handleImageChange}
                        required
                    />
                </div>

                <button type="submit" className="btn btn-primary">Cadastrar Banners</button>
            </form>
        </div>
    );
}

export default CadastrarBanners;
