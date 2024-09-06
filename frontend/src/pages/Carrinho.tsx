import CardLaterais from "../components/CardLaterais"
import React, { useState, ChangeEvent, FormEvent } from 'react'; 
function Carrinho(){
return(
    <div className="container"> 
    <div className="row">
      <h1>Carrinhos</h1>
      <div className="d-flex flex-column justify-content-center align-items-center"> 
        <div className="col mb-2"> 
          <CardLaterais/>
        </div>
        <div className="col mb-2"> 
          <CardLaterais/>
        </div>
        <div className="col mb-2"> 
          <CardLaterais/>
        </div>
      </div>
    </div>
  </div>
)

}

export default Carrinho