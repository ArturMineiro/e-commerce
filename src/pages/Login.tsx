import React from 'react';

function Login() {
  return (
    <div className="d-flex justify-content-center align-items-center ">
    <div className="login-container w-50 ">
      <div className="login-form shadow p-3 mb-5 bg-white rounded">
        <h2>Login</h2>
        <form>
          <div className="form-row">
            <div className="col-md-4 mb-3">
              <label htmlFor="validationServer01">Usuário</label>
              <input type="text" className="form-control" id="validationServer01" placeholder="Nome de usuário" required />
            </div>
            <div className="col-md-4 mb-3">
              <label htmlFor="validationServer02">Senha</label>
              <input type="password" className="form-control" id="validationServer02" placeholder="Senha" required />
            </div>
          </div>
          <div className="form-row">
            <div className="col-md-4 mb-3">
              <a href="#" className="text-primary">Esqueceu sua senha?</a>
            </div>
          </div>
          <button className="btn btn-primary" type="submit">Logar</button>
        </form>
      </div>
    </div>
    </div>
  );
}

export default Login;
