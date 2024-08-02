import React from 'react';

function Register() {
  return (
    <div className="d-flex justify-content-center align-items-center">
      <div className="register-container w-50">
        <div className="register-form shadow p-3 mb-5 bg-white rounded">
          <h2>Registrar</h2>
          <form>
            <div className="form-row">
              <div className="col-md-6 mb-3 w-100">
                <label htmlFor="registerUsername">Usuário</label>
                <input type="text" className="form-control " id="registerUsername" placeholder="Nome de usuário" required />
              </div>
              <div className="col-md-6 mb-3 w-100">
                <label htmlFor="registerEmail">Email</label>
                <input type="email" className="form-control" id="registerEmail" placeholder="Digite seu email" required />
              </div>
            </div>
            <div className="form-row">
              <div className="col-md-6 mb-3">
                <label htmlFor="registerPassword">Senha</label>
                <input type="password" className="form-control" id="registerPassword" placeholder="Senha" required />
              </div>
              <div className="col-md-6 mb-3">
                <label htmlFor="registerConfirmPassword">Confirmar Senha</label>
                <input type="password" className="form-control" id="registerConfirmPassword" placeholder="Confirme sua senha" required />
              </div>
            </div>
            <button className="btn btn-primary" type="submit">Registrar</button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Register;
