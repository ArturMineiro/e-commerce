import { FaFacebook } from "react-icons/fa";
import { FaTwitter } from "react-icons/fa6";
import { FaInstagram } from "react-icons/fa";
function Footer(){
return (
    <footer className="bg-dark text-light py-4 mt-4">
    <div className="container text-center">
      <div className="row">
        <div className="col-md-4">
          <h5>Sobre</h5>
          <p>e-commerce focado em vendas de roupas.</p>
        </div>
        <div className="col-md-4">
          <h5>Contatos</h5>
          <ul className="list-unstyled">
            <li>Email: info@example.com</li>
            <li>Telefone: +123 456 7890</li>
          </ul>
        </div>
        <div className="col-md-4">
          <h5>Siga nossos perfis</h5>
          <ul className="list-unstyled d-flex justify-content-center mt-5">
              <li className="mx-3">
                <a href="#" className="text-light">
                  <FaFacebook size={30} />
                </a>
              </li>
              <li className="mx-3">
                <a href="#" className="text-light">
                  <FaTwitter size={30} />
                </a>
              </li>
              <li className="mx-3">
                <a href="#" className="text-light">
                  <FaInstagram size={30} />
                </a>
              </li>
            </ul>
        </div>
      </div>
      <div className="row mt-3">
        <div className="col-md-12">
          <p className="mb-0">&copy; {new Date().getFullYear()} Your Company. All rights reserved.</p>
        </div>
      </div>
    </div>
  </footer>
)
}

export default Footer