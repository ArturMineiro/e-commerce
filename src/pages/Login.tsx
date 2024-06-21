import React from 'react';

function Login() {
  return (
    <div className="login-container">
      <div className="login-form shadow p-3 mb-5 bg-white rounded">
        <h2>Cadastro</h2>
        <form>
          <div className="form-row">
            <div className="col-md-4 mb-3">
              <label htmlFor="validationServer01">Usuário</label>
              <input type="text" className="form-control" id="validationServer01" placeholder="Nome de usuario" required />
        
            </div>
            <div className="col-md-4 mb-3">
              <label htmlFor="validationServer02">Senha</label>
              <input type="password" className="form-control " id="validationServer02" placeholder="Senha" required />
          
            </div>
            <div className="col-md-4 mb-3">
              <label htmlFor="validationServerEmail">Email</label>
              <div className="input-group">
                <div className="input-group-prepend">
                  <span className="input-group-text" id="inputGroupPrepend3">@</span>
                </div>
                <input type="email" className="form-control " id="validationServerEmail" placeholder="E-mail" aria-describedby="inputGroupPrepend3" required />
              
              </div>
            </div>
          </div>
          <div className="form-row">
            <div className="col-md-6 mb-3">
              <label htmlFor="validationServer03">Número</label>
              <input type="text" className="form-control " id="validationServer03" placeholder="Número" required />
         
            </div>
          </div>
          <button className="btn btn-primary" type="submit">Atualizar cadastro</button>
        </form>
      </div>
    </div>
  );
}

export default Login;
