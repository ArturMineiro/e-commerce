import React, { useState, ChangeEvent, FormEvent } from 'react';
import axios from 'axios';

function CadastrarBanners() {
    const [bannerName, setBannerName] = useState<string>('');
    const [bannerImage, setBannerImage] = useState<File | null>(null);
    const [message, setMessage] = useState<string>('');

    const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setBannerImage(e.target.files[0]);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!bannerImage) {
            setMessage('Selecione uma imagem para o banner.');
            return;
        }

        const formData = new FormData();
        formData.append('bannerName', bannerName);
        formData.append('bannerImage', bannerImage);

        try {
            await axios.post('/api/banners', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setMessage('Banner cadastrado com sucesso!');
        } catch (error) {
            setMessage('Erro ao cadastrar o banner. Tente novamente.');
        }
    };

    return (
        <div className="container mt-5 shadow p-3 mb-5 bg-body rounded">
            <h2>Cadastrar Novo Banner</h2>
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
                    <label htmlFor="bannerImage" className="form-label">Imagem do Banner</label>
                    <input
                        type="file"
                        className="form-control"
                        id="bannerImage"
                        onChange={handleImageChange}
                        required
                    />
                </div>

                <button type="submit" className="btn btn-primary">Cadastrar Banner</button>
            </form>
        </div>
    );
}

export default CadastrarBanners;
