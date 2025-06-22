import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import './App.css';

// Fix para ícones do Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Ícone diferente para postos
const gasStationIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Componente para o formulário de preços
function PriceForm({ stationId, onPriceAdded }) {
    const [fuelType, setFuelType] = useState('gasolina_comum');
    const [price, setPrice] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!price) return;

        setLoading(true);
        try {
            await axios.post('https://postoaqui-production.up.railway.app/api/prices', {
                gas_station_id: stationId,
                fuel_type: fuelType,
                price: parseFloat(price)
            });

            setPrice('');
            alert('Preço reportado com sucesso!');
            onPriceAdded(); // Atualizar os preços
        } catch (error) {
            console.error('Erro ao reportar preço:', error);
            alert('Erro ao reportar preço');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="price-form">
            <h4>Reportar Preço</h4>
            <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value)}
                className="fuel-select"
            >
                <option value="gasolina_comum">Gasolina Comum</option>
                <option value="gasolina_aditivada">Gasolina Aditivada</option>
                <option value="etanol">Etanol</option>
                <option value="diesel">Diesel</option>
            </select>

            <div className="price-input-group">
                <span>R$</span>
                <input
                    type="number"
                    step="0.001"
                    placeholder="0.000"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="price-input"
                    required
                />
            </div>

            <button type="submit" disabled={loading} className="submit-btn">
                {loading ? 'Enviando...' : 'Reportar'}
            </button>
        </form>
    );
}

// Componente para mostrar preços
function PriceList({ stationId }) {
    const [prices, setPrices] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPrices = async () => {
        try {
            const response = await axios.get(`https://postoaqui-production.up.railway.app/api/gas-stations/${stationId}/latest-prices`);
            setPrices(response.data);
        } catch (error) {
            console.error('Erro ao buscar preços:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPrices();
    }, [stationId]);

    const formatFuelType = (type) => {
        const types = {
            'gasolina_comum': 'Gasolina Comum',
            'gasolina_aditivada': 'Gasolina Aditivada',
            'etanol': 'Etanol',
            'diesel': 'Diesel'
        };
        return types[type] || type;
    };

    if (loading) return <p>Carregando preços...</p>;

    return (
        <div className="price-list">
            <h4>Preços Atuais</h4>
            {prices.length === 0 ? (
                <p>Nenhum preço reportado ainda</p>
            ) : (
                prices.map((priceData, index) => (
                    <div key={index} className="price-item">
                        <span className="fuel-type">{formatFuelType(priceData.fuel_type)}</span>
                        <span className="price">R$ {parseFloat(priceData.price).toFixed(3)}</span>
                    </div>
                ))
            )}
        </div>
    );
}

function App() {
    const [userLocation, setUserLocation] = useState(null);
    const [gasStations, setGasStations] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchGasStations = async (lat, lng) => {
        try {
            console.log('Buscando postos para:', lat, lng);
            const response = await axios.get(`https://postoaqui-production.up.railway.app/api/gas-stations?lat=${lat}&lng=${lng}&radius=300`);
            console.log('Resposta da API:', response.data);
            setGasStations(response.data);
        } catch (error) {
            console.error('Erro ao buscar postos:', error);
        }
    };

    useEffect(() => {
        // Pegar localização do usuário
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const coords = [position.coords.latitude, position.coords.longitude];
                    setUserLocation(coords);
                    fetchGasStations(coords[0], coords[1]);
                    setLoading(false);
                },
                (error) => {
                    console.error('Erro ao obter localização:', error);
                    // Localização padrão (São Paulo)
                    const coords = [-23.5505, -46.6333];
                    setUserLocation(coords);
                    fetchGasStations(coords[0], coords[1]);
                    setLoading(false);
                }
            );
        } else {
            // Fallback se geolocalização não disponível
            const coords = [-23.5505, -46.6333];
            setUserLocation(coords);
            fetchGasStations(coords[0], coords[1]);
            setLoading(false);
        }
    }, []);

    if (loading) {
        return <div className="loading">Carregando mapa...</div>;
    }

    return (
        <div className="App">
            <header className="App-header">
                <h1>PostoAqui</h1>
                <p>Encontre os melhores preços de combustível perto de você</p>
                <p>Postos encontrados: {gasStations.length}</p>
            </header>

            <div className="map-container">
                <MapContainer
                    center={userLocation}
                    zoom={13}
                    style={{ height: '500px', width: '100%' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />

                    {/* Marker do usuário */}
                    <Marker position={userLocation}>
                        <Popup>Você está aqui!</Popup>
                    </Marker>

                    {/* Markers dos postos */}
                    {gasStations.map((station) => (
                        <Marker
                            key={station.id}
                            position={[parseFloat(station.latitude), parseFloat(station.longitude)]}
                            icon={gasStationIcon}
                        >
                            <Popup maxWidth={400} className="station-popup">
                                <div className="station-info">
                                    <h3>{station.name}</h3>
                                    <p>{station.address}</p>
                                    <p>Distância: {station.distance.toFixed(2)} km</p>

                                    <PriceList stationId={station.id} />

                                    <PriceForm
                                        stationId={station.id}
                                        onPriceAdded={() => window.location.reload()}
                                    />
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                </MapContainer>
            </div>
        </div>
    );
}

export default App;