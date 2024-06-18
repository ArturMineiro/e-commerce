import React, { useState } from 'react';



function Search() {
    return (
        <form className="d-flex" style={{ maxWidth: '500px', width: '100%' }}>
            <input className="form-control me-2" type="search" placeholder="Search" aria-label="Search" />
            <button className="btn btn-outline-success" type="submit">Search</button>
        </form>
    );
}

export default Search;