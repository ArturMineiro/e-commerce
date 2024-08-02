import React, {useState} from 'react';

function Login() {
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  const handleForgotPasswordClick = () => {
    setIsForgotPassword(true);
  };

  const handleBackToLoginClick = () => {
    setIsForgotPassword(false);
  };

  return (
    <div className="d-flex justify-content-center align-items-center">
      <div className="login-container w-50">
        <div className="login-form shadow p-3 mb-5 bg-white rounded">
          {isForgotPassword ? (
            <>
              <h2>Recuperar Senha</h2>
              <form>
                <div className="form-row mt-5">
                  <div className="col-md-8 mb-3 ">
                    <label htmlFor="email">Email</label>
                    <input type="email" className="form-control" id="email" placeholder="Digite seu email" required />
                  </div>
                  <button className="btn btn-primary mr-2" type="submit">Enviar Email de Redefinição</button>
                  <button className="btn btn-secondary d-flex justify-content-end mt-2" type="button" onClick={handleBackToLoginClick}>Voltar ao Login</button>
                </div>
              
              </form>
            </>
          ) : (
            <>
              <h2>Login</h2>
              <form>
                <div className="form-row">
                  <div className="col-md-4 mb-3 w-100">
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
                    <a href="#" className="text-primary" onClick={handleForgotPasswordClick}>Esqueceu sua senha?</a>
                  </div>
                </div>
                <button className="btn btn-primary" type="submit">Logar</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Login;