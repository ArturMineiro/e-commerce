import React, { useState, useEffect } from 'react';
import axios from 'axios';

// Tipagem dos banners
interface Banner {
    id: number;
    image_urls: string[];
}

function Carroussel() {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [message, setMessage] = useState<string>('');

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const response = await axios.get('http://localhost:8000/api/banners');
                setBanners(response.data);
            } catch (error) {
                setMessage('Erro ao carregar os banners.');
            }
        };

        fetchBanners();
    }, []);

    return (
        <div id="carouselExampleControls" className="carousel slide carousel-custom-height mb-4 mt-4" data-bs-ride="carousel">
           
            <div className="carousel-inner">
                {banners.length > 0 ? (
                    banners.map((banner, index) => {
                     
                        const imageUrls = Array.isArray(banner.image_urls) ? banner.image_urls : JSON.parse(banner.image_urls);
                        return imageUrls.map((url: string, imgIndex: number) => (
                            <div
                                key={`${banner.id}-${imgIndex}`}
                                className={`carousel-item ${index === 0 && imgIndex === 0 ? 'active' : ''}`} // A primeira imagem precisa ter a classe 'active'
                            >
                                <img
                                    className="d-block w-100 rounded"
                                    src={`http://localhost:8000/storage/${url}`} 
                                    alt={`Banner ${imgIndex}`}
                                    style={{ height: '700px', width: '500px' }}
                                />
                            </div>
                        ));
                    })
                ) : (
                    <div className="carousel-item active">
                        <p>{message || 'Nenhum banner disponível.'}</p>
                    </div>
                )}
            </div>
            <a className="carousel-control-prev" href="#carouselExampleControls" role="button" data-bs-slide="prev">
                <span className="carousel-control-prev-icon" aria-hidden="true"></span>
                <span className="sr-only">Voltar</span>
            </a>
            <a className="carousel-control-next" href="#carouselExampleControls" role="button" data-bs-slide="next">
                <span className="carousel-control-next-icon" aria-hidden="true"></span>
                <span className="sr-only">Avançar</span>
            </a>
        </div>
    );
}

export default Carroussel;
