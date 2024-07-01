import { Link } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { FaHeart } from "react-icons/fa6";
import { FaCartShopping } from "react-icons/fa6";
import logo from "/assets/logo.png";
import Search from "./Search";


function Navbar() {
  return (
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
          <div className="container-fluid">
              <Link to="/" className="navbar-brand">
                  <img
                      src={logo}
                      alt="Logo"
                      className="rounded-circle"
                      style={{ width: "80px", height: "80px" }}
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
              <div className="collapse navbar-collapse" id="navbarNav">
                  <div className="d-flex flex-grow-1 justify-content-center">
                      <Search />
                  </div>
                  <ul className="navbar-nav ms-auto">
                  <li className="nav-item me-3">
                  <Link className="nav-link fs-4 mt-2" to="meuspedidos"> Meus pedidos </Link>
                      </li>
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
                              className="nav-link dropdown-toggle fs-2"
                              id="navbarDropdown"
                              role="button"
                              data-bs-toggle="dropdown"
                              aria-expanded="false"
                          >
                              <FaUserCircle />
                          </a>
                          <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">
                              <li>
                                  <Link className="dropdown-item" to="/login">
                                      Login
                                  </Link>
                              </li>
                              <li>
                                  <Link className="dropdown-item" to="/home">
                                      Sair
                                  </Link>
                              </li>
                          </ul>
                      </li>
                      {/* Adicione outros links aqui conforme necessário */}
                  </ul>
              </div>
          </div>
      </nav>
  );
}

export default Navbar;