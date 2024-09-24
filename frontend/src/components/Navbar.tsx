import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaUserCircle } from 'react-icons/fa';
import { FaHeart, FaCartShopping } from 'react-icons/fa6';
import logo from '/assets/logo.png';
import './Components.css'; // Certifique-se de importar o arquivo CSS corretamente
import Search from './Search';
import { useAuth } from '../hooks/AuthContext'; // Atualize o caminho se necessário
const Navbar: React.FC = () => {
  const { loggedIn, logout } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState(loggedIn);
  const navigate = useNavigate();

  useEffect(() => {
    setIsAuthenticated(loggedIn);
  }, [loggedIn]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container-fluid">
        <Link to="/" className="navbar-brand">
          <img
            src={logo}
            alt="Logo"
            className="rounded-circle logo"
          />
        </Link>
        
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div className="search-container">
          <Search />
        </div>

        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav ms-auto icons-container">
            {isAuthenticated && (
              <li className="nav-item me-3 ">
                <Link className="nav-link fs-4 mt-2" to="/meuspedidos">
                  Meus pedidos
                </Link>
              </li>
            )}
            <li className="nav-item me-3">
              <Link className="nav-link fs-2" to="/curtidos">
                <FaHeart />
              </Link>
            </li>
            <li className="nav-item me-3">
              <Link className="nav-link fs-2" to="/carrinho">
                <FaCartShopping />
              </Link>
            </li>
            <li className="nav-item dropdown">
              <a
                className="nav-link fs-2"
                id="navbarDropdown"
                role="button"
                data-bs-toggle="dropdown"
                aria-expanded="false"
              >
                <FaUserCircle />
              </a>
              <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">
                {!isAuthenticated ? (
                  <li>
                    <Link className="dropdown-item" to="/login">
                      Login
                    </Link>
                  </li>
                ) : (
                  <li>
                    <a className="dropdown-item" onClick={handleLogout}>
                      Sair
                    </a>
                  </li>
                )}
              </ul>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;