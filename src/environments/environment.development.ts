export const environment = {
    produccion: false,
    urlApi: 'http://localhost:3100',
    urlPortal: 'http://localhost:4200',

    // Login con Microsoft: mismo registro de aplicación que el Portal.
    // No son secretos (cualquiera los ve en el navegador).
    azure: {
        idTenant: '992b6a9e-ef0b-492d-b99b-9616c17eb86f',
        idCliente: '951fafed-e222-4b92-bf80-26d157f467c4'
    }
};
