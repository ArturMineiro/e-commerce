import { Link } from "react-router-dom";
import { FaUserCircle } from "react-icons/fa";
import { FaHeart } from "react-icons/fa6";
import { FaCartShopping } from "react-icons/fa6";
import logo from "/assets/logo.png";
function Navbar() {
    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-4">
        <div className="container-fluid">
        <Link to="/"> 
        <img src={logo} alt="Logo" className="rounded-circle" style={{ width: '80px', height: '80px' }} />
        </Link>
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
                <ul className="navbar-nav ms-auto">
                    <li className="nav-item me-3">
                        <Link className="nav-link fs-2" to="/curtidos"><FaHeart /></Link>
                    </li>
                    <li className="nav-item me-3">
                        <Link className="nav-link fs-2" to="/carrinho"><FaCartShopping /></Link>
                    </li>
                    <li className="nav-item me-3">
                        <Link className="nav-link fs-2" to="/login"><FaUserCircle /></Link>
                    </li>
                    {/* Adicione outros links aqui conforme necessário */}
                </ul>
            </div>
        </div>
    </nav>
    );
}

export default Navbar;
