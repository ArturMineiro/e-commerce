function Card(){
    return(
        <div className="card mb-4 md-3 shadow p-3 mb-5 bg-white rounded" style={{ width: '17rem', border: 'none' }}>
        <img src="/assets/cardimage.jpg" className="card-img-top "  style={{ height:'18em', border: 'none' }} alt="Card image" />
        <div className="card-body">
            <p className="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
        </div>
    </div>
    
    )
}

export default Card