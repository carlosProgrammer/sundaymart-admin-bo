import axios from "axios";

const termsGet = async (id_shop) => {
    const token = localStorage.getItem('jwt_token');
    const url = "/api/auth/terms/get";
    const body = {
        id_shop: id_shop,
    };

    const headers = {
        "Authorization": "Bearer " + token
    }

    const response = await axios({
        method: 'post',
        url: url,
        data: body,
        headers: headers
    });

    return response;
}

export default termsGet;
