
function Carroussel() {


  return (
    <div id="carouselExampleControls" className="carousel slide carousel-custom-height mb-4 mt-4 " data-bs-ride="carousel">
      <div className="carousel-inner">
        <div className="carousel-item active">
          <img className="d-block w-100 rounded" src="/assets/homeimage1.jpg" alt="First slide" style={{ height: '500px' }}/>
        </div>
        <div className="carousel-item">
          <img className="d-block w-100 rounded" src="/assets/homeimage2.jpg" alt="Second slide" style={{ height: '500px' }} />
        </div>
        <div className="carousel-item">
          <img className="d-block w-100 rounded" src="/assets/homeimage3.jpg" alt="Third slide" style={{ height: '500px' }} />
        </div>
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