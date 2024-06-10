import React, { useEffect } from 'react';

function Carrousel() {
    useEffect(() => {
        const carouselElement = document.querySelector<HTMLDivElement>('#carouselExampleSlidesOnly');
        if (carouselElement) {
          import('bootstrap').then((bootstrap) => {
            new bootstrap.Carousel(carouselElement, {
              interval: 2000, // 2 segundos
              ride: 'carousel'
            });
          });
        }
      }, []);
  
    return (
        <div id="carouselExampleSlidesOnly" className="carousel slide" data-bs-ride="carousel">
        <div className="carousel-inner">
          <div className="carousel-item active">
            <img className="d-block w-100 carousel-image" src="/assets/homeimage1.jpg" alt="First slide" />
          </div>
          <div className="carousel-item">
            <img className="d-block w-100 carousel-image" src="/assets/homeimage2.jpg" alt="Second slide" />
          </div>
          <div className="carousel-item">
            <img className="d-block w-100 carousel-image" src="/assets/homeimage3.jpg" alt="Third slide" />
          </div>
        </div>
      </div>
    );
  }

export default Carrousel