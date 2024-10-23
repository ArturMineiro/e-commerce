import React, { useState, useEffect } from 'react';

function CardLaterais() {
    return (
        <div className="card mb-4 md-3 shadow p-3 mb-5 bg-white rounded d-flex flex-row w-75 ">
        <img src="/assets/homeimage1.jpg" className="card-img-left" alt="Card image" style={{ width: '20%' }} />
        <div className="card-body">
            <p className="card-text">Some quick example text to build on the card title and make up the bulk of the card's content.</p>
        </div>
    </div>
    );
}

export default CardLaterais;
