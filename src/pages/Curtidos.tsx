import Card from "../components/Card"




function Curtidos() {
    return (
        <div className="container mt-4">
        <div className="row">
            <div className="col-md-3 mb-3">
                <Card />
            </div>
            <div className="col-md-3 mb-3">
                <Card />
            </div>
            <div className="col-md-3 mb-3">
                <Card />
            </div>
            <div className="col-md-3 mb-3">
                <Card />
            </div>
            {/* Adicione mais Cards conforme necessário */}
        </div>
    </div>
    );
}



export default Curtidos