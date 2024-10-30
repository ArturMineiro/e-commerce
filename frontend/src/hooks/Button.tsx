
import React from 'react';
import { Link } from 'react-router-dom';

function Button({ label, to }) {
    return (
        <Link to={to} className="btn btn-primary">
            {label}
        </Link>
    );
}

export default Button;
