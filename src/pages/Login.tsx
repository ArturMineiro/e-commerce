function Login(){
    return(
        
            <div className="login-container">
              <div className="login-form">
                <h2>Cadastro</h2>
                <form>
                  <div className="form-group">
                    <label htmlFor="username">Usuário</label>
                    <input type="text" className="form-control" id="username" placeholder="Digite seu usuário" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="password">Senha</label>
                    <input type="password" className="form-control" id="password" placeholder="Digite sua senha" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <input type="email" className="form-control" id="email" placeholder="Digite seu email" />
                  </div>
                  <div className="form-group">
                    <label htmlFor="phone">Telefone</label>
                    <input type="tel" className="form-control" id="phone" placeholder="Digite seu telefone" />
                  </div>
                  <button type="submit" className="btn btn-primary btn-block mt-3">Atualizar</button>
                </form>
              </div>
            </div>
    )
}

export default Login