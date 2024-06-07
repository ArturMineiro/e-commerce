import { Link } from "react-router-dom";


function Navbar() {
    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark py-4">
        <div className="container-fluid">
            {/* <Link className="navbar-brand" to="/">Meu Site</Link> */}
            <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse" id="navbarNav">
                <ul className="navbar-nav ms-auto">
                    <li className="nav-item me-3">
                        <Link className="nav-link fs-4" to="/home">Home</Link>
                    </li>
                    <li className="nav-item me-3">
                        <Link className="nav-link fs-4" to="/teste">Teste</Link>
                    </li>
                    {/* Adicione outros links aqui conforme necessário */}
                </ul>
            </div>
        </div>
    </nav>
    );
}

export default Navbar;
