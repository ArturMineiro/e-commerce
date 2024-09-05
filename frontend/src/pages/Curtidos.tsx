import Card from "../components/Card"
import React, { useState, ChangeEvent, FormEvent } from 'react';



function Curtidos() {
    return (
        <div className="container mt-4 ">
        <div className="row">
            <h1>Favoritados</h1>
            <div className="col-md-3 mb-3 ">
                <Card />
            </div>
            <div className="col-md-3 mb-3">
                <Card />
            </div>
            <div className="col-md-3 mb-3">
                <Card />
            </div>
            <div className="col-md-3 mb-3">
                <Card />
            </div>
            {/* Adicione mais Cards conforme necessário */}
        </div>
    </div>
    );
}



export default Curtidos