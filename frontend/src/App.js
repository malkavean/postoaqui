import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
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

// Ícone para novo posto
const newStationIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

// Componente para gerenciar cliques no mapa
function MapClickHandler({ onMapClick, addingStation }) {
    useMapEvents({
        click(e) {
            if (addingStation) {
                onMapClick(e.latlng);
            }
        },
    });

    return null;
}

// Componente para formulário de novo posto
function NewStationForm({ position, onSave, onCancel }) {
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name.trim() || !address.trim()) {
            toast.error('Nome e endereço são obrigatórios');
            return;
        }

        setLoading(true);
        const loadingToast = toast.loading('Criando posto...');

        try {
            await axios.post('https://postoaqui-production.up.railway.app/api/gas-stations', {
                name: name.trim(),
                address: address.trim(),
                latitude: position.lat,
                longitude: position.lng
            });

            toast.success('Posto criado com sucesso! 🎉', {
                id: loadingToast,
                duration: 3000
            });

            onSave();
        } catch (error) {
            console.error('Erro ao criar posto:', error);
            if (error.response?.data?.errors) {
                toast.error(`Erro: ${error.response.data.errors[0]}`, {
                    id: loadingToast,
                    duration: 4000
                });
            } else {
                toast.error('Erro ao criar posto. Tente novamente.', {
                    id: loadingToast,
                    duration: 4000
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="new-station-form">
            <h4>Novo Posto de Gasolina</h4>
            <p className="coordinates">
                📍 Lat: {position.lat.toFixed(6)}, Lng: {position.lng.toFixed(6)}
            </p>

            <input
                type="text"
                placeholder="Nome do posto (ex: Posto Shell Centro)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                required
            />

            <input
                type="text"
                placeholder="Endereço completo"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="form-input"
                required
            />

            <div className="form-buttons">
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn btn-cancel"
                    disabled={loading}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="btn btn-save"
                    disabled={loading}
                >
                    {loading ? 'Salvando...' : 'Salvar Posto'}
                </button>
            </div>
        </form>
    );
}

// Componente para editar posto
function EditStationForm({ station, onSave, onCancel }) {
    const [name, setName] = useState(station.name);
    const [address, setAddress] = useState(station.address);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name.trim() || !address.trim()) {
            toast.error('Nome e endereço são obrigatórios');
            return;
        }

        setLoading(true);
        const loadingToast = toast.loading('Atualizando posto...');

        try {
            await axios.put(`https://postoaqui-production.up.railway.app/api/gas-stations/${station.id}`, {
                name: name.trim(),
                address: address.trim(),
                latitude: parseFloat(station.latitude),
                longitude: parseFloat(station.longitude)
            });

            toast.success('Posto atualizado com sucesso! ✅', {
                id: loadingToast,
                duration: 3000
            });

            onSave();
        } catch (error) {
            console.error('Erro ao atualizar posto:', error);
            if (error.response?.data?.errors) {
                toast.error(`Erro: ${error.response.data.errors[0]}`, {
                    id: loadingToast,
                    duration: 4000
                });
            } else {
                toast.error('Erro ao atualizar posto. Tente novamente.', {
                    id: loadingToast,
                    duration: 4000
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="edit-station-form">
            <h4>Editar Posto</h4>

            <input
                type="text"
                placeholder="Nome do posto"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="form-input"
                required
            />

            <input
                type="text"
                placeholder="Endereço completo"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="form-input"
                required
            />

            <div className="form-buttons">
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn btn-cancel"
                    disabled={loading}
                >
                    Cancelar
                </button>
                <button
                    type="submit"
                    className="btn btn-save"
                    disabled={loading}
                >
                    {loading ? 'Salvando...' : 'Salvar Alterações'}
                </button>
            </div>
        </form>
    );
}

// Componente para o formulário de preços (Modal)
function PriceFormModal({ stationId, stationName, visible, onClose, onPriceAdded }) {
    const [fuelType, setFuelType] = useState('gasolina_comum');
    const [price, setPrice] = useState('');
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState([]);

    // Faixas de preços válidos
    const priceRanges = {
        'gasolina_comum': { min: 4.50, max: 8.00 },
        'gasolina_aditivada': { min: 4.80, max: 8.50 },
        'etanol': { min: 2.50, max: 6.00 },
        'diesel': { min: 4.00, max: 7.50 }
    };

    const validatePrice = (value, fuel) => {
        const errors = [];
        const numPrice = parseFloat(value);

        if (!value || isNaN(numPrice) || numPrice <= 0) {
            errors.push('Digite um preço válido');
            return errors;
        }

        const range = priceRanges[fuel];
        if (numPrice < range.min || numPrice > range.max) {
            errors.push(`Preço deve estar entre R$ ${range.min.toFixed(2)} e R$ ${range.max.toFixed(2)}`);
        }

        return errors;
    };

    const handlePriceChange = (value) => {
        setPrice(value);
        const validationErrors = validatePrice(value, fuelType);
        setErrors(validationErrors);
    };

    const handleFuelTypeChange = (fuel) => {
        setFuelType(fuel);
        if (price) {
            const validationErrors = validatePrice(price, fuel);
            setErrors(validationErrors);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const validationErrors = validatePrice(price, fuelType);
        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        }

        setLoading(true);
        const loadingToast = toast.loading('Reportando preço...');

        try {
            await axios.post('https://postoaqui-production.up.railway.app/api/prices', {
                gas_station_id: stationId,
                fuel_type: fuelType,
                price: parseFloat(price)
            });

            setPrice('');
            setErrors([]);

            toast.success('Preço reportado com sucesso! 🎉', {
                id: loadingToast,
                duration: 3000
            });

            onPriceAdded();
            onClose();
        } catch (error) {
            console.error('Erro ao reportar preço:', error);

            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
                toast.error(`Erro: ${error.response.data.errors[0]}`, {
                    id: loadingToast,
                    duration: 4000
                });
            } else {
                toast.error('Erro ao reportar preço. Tente novamente.', {
                    id: loadingToast,
                    duration: 4000
                });
            }
        } finally {
            setLoading(false);
        }
    };

    const currentRange = priceRanges[fuelType];

    if (!visible) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Reportar Preço</h3>
                    <p className="station-name">{stationName}</p>
                    <button
                        onClick={onClose}
                        className="modal-close-btn"
                        title="Fechar"
                    >
                        ❌
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="price-form-modal">
                    {errors.length > 0 && (
                        <div className="error-messages">
                            {errors.map((error, index) => (
                                <p key={index} className="error-message">{error}</p>
                            ))}
                        </div>
                    )}

                    <label className="form-label">Tipo de Combustível:</label>
                    <select
                        value={fuelType}
                        onChange={(e) => handleFuelTypeChange(e.target.value)}
                        className="fuel-select"
                    >
                        <option value="gasolina_comum">Gasolina Comum</option>
                        <option value="gasolina_aditivada">Gasolina Aditivada</option>
                        <option value="etanol">Etanol</option>
                        <option value="diesel">Diesel</option>
                    </select>

                    <label className="form-label">Preço (R$):</label>
                    <div className="price-input-group">
                        <span>R$</span>
                        <input
                            type="number"
                            step="0.001"
                            placeholder="0.000"
                            value={price}
                            onChange={(e) => handlePriceChange(e.target.value)}
                            className={`price-input ${errors.length > 0 ? 'error' : ''}`}
                            required
                            autoFocus
                        />
                    </div>

                    <p className="price-hint">
                        Faixa válida: R$ {currentRange.min.toFixed(2)} - R$ {currentRange.max.toFixed(2)}
                    </p>

                    <div className="modal-buttons">
                        <button
                            type="button"
                            onClick={onClose}
                            className="btn btn-cancel"
                            disabled={loading}
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || errors.length > 0}
                            className="btn btn-save"
                        >
                            {loading ? 'Enviando...' : 'Reportar Preço'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
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
            toast.error('Erro ao carregar preços do posto', {
                duration: 3000
            });
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
    const [addingStation, setAddingStation] = useState(false);
    const [newStationPosition, setNewStationPosition] = useState(null);
    const [editingStation, setEditingStation] = useState(null);
    const [showingPriceForm, setShowingPriceForm] = useState(null);
    const [selectedStation, setSelectedStation] = useState(null);

    const fetchGasStations = async (lat, lng) => {
        try {
            console.log('Buscando postos para:', lat, lng);
            const response = await axios.get(`https://postoaqui-production.up.railway.app/api/gas-stations?lat=${lat}&lng=${lng}&radius=300`);
            console.log('Resposta da API:', response.data);
            setGasStations(response.data);

            if (response.data.length === 0) {
                toast('Nenhum posto encontrado na região', {
                    icon: '⛽',
                    duration: 3000
                });
            } else {
                toast.success(`${response.data.length} posto(s) encontrado(s)`, {
                    duration: 2000
                });
            }

        } catch (error) {
            console.error('Erro ao buscar postos:', error);
            toast.error('Erro ao carregar postos da região', {
                duration: 4000
            });
        }
    };

    useEffect(() => {
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
                    toast.error('Não foi possível obter sua localização. Usando São Paulo como padrão.', {
                        duration: 4000
                    });
                    const coords = [-23.5505, -46.6333];
                    setUserLocation(coords);
                    fetchGasStations(coords[0], coords[1]);
                    setLoading(false);
                }
            );
        } else {
            const coords = [-23.5505, -46.6333];
            setUserLocation(coords);
            fetchGasStations(coords[0], coords[1]);
            setLoading(false);
        }
    }, []);

    const handleMapClick = (latlng) => {
        if (addingStation) {
            setNewStationPosition(latlng);
        }
    };

    const handleSaveNewStation = () => {
        setNewStationPosition(null);
        setAddingStation(false);
        if (userLocation) {
            fetchGasStations(userLocation[0], userLocation[1]);
        }
    };

    const handleCancelNewStation = () => {
        setNewStationPosition(null);
        setAddingStation(false);
    };

    const handleEditStation = (station) => {
        setEditingStation(station);
    };

    const handleSaveEditStation = () => {
        setEditingStation(null);
        if (userLocation) {
            fetchGasStations(userLocation[0], userLocation[1]);
        }
    };

    const handleShowPriceForm = (station) => {
        setSelectedStation(station);
        setShowingPriceForm(station.id);
    };

    const handleHidePriceForm = () => {
        setShowingPriceForm(null);
        setSelectedStation(null);
    };

    const handlePriceAdded = () => {
        setShowingPriceForm(null);
        setSelectedStation(null);
        if (userLocation) {
            fetchGasStations(userLocation[0], userLocation[1]);
        }
    };

    const handleDeleteStation = async (station) => {
        if (window.confirm(`Tem certeza que deseja deletar o posto "${station.name}"?`)) {
            const loadingToast = toast.loading('Deletando posto...');

            try {
                await axios.delete(`https://postoaqui-production.up.railway.app/api/gas-stations/${station.id}`);

                toast.success('Posto deletado com sucesso! 🗑️', {
                    id: loadingToast,
                    duration: 3000
                });

                if (userLocation) {
                    fetchGasStations(userLocation[0], userLocation[1]);
                }
            } catch (error) {
                console.error('Erro ao deletar posto:', error);
                toast.error('Erro ao deletar posto. Tente novamente.', {
                    id: loadingToast,
                    duration: 4000
                });
            }
        }
    };

    if (loading) {
        return <div className="loading">Carregando mapa...</div>;
    }

    return (
        <div className="App">
            <Toaster
                position="top-center"
                toastOptions={{
                    duration: 3000,
                    style: {
                        background: '#363636',
                        color: '#fff',
                        fontWeight: 'bold',
                    },
                    success: {
                        style: {
                            background: '#4ade80',
                            color: '#fff',
                        },
                    },
                    error: {
                        style: {
                            background: '#ef4444',
                            color: '#fff',
                        },
                    },
                }}
            />

            <header className="App-header">
                <h1>PostoAqui</h1>
                <p>Encontre os melhores preços de combustível perto de você</p>
                <div className="header-stats">
                    <span>Postos encontrados: {gasStations.length}</span>
                    <button
                        onClick={() => setAddingStation(!addingStation)}
                        className={`add-station-btn ${addingStation ? 'active' : ''}`}
                    >
                        {addingStation ? '❌ Cancelar' : '➕ Adicionar Posto'}
                    </button>
                </div>
                {addingStation && (
                    <p className="add-instruction">📍 Clique no mapa onde deseja adicionar o posto</p>
                )}
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

                    <MapClickHandler onMapClick={handleMapClick} addingStation={addingStation} />

                    {/* Marker do usuário */}
                    <Marker position={userLocation}>
                        <Popup>Você está aqui!</Popup>
                    </Marker>

                    {/* Markers dos postos existentes */}
                    {gasStations.map((station) => (
                        <Marker
                            key={station.id}
                            position={[parseFloat(station.latitude), parseFloat(station.longitude)]}
                            icon={gasStationIcon}
                        >
                            <Popup maxWidth={400} className="station-popup">
                                <div className="station-info">
                                    {editingStation && editingStation.id === station.id ? (
                                        <EditStationForm
                                            station={editingStation}
                                            onSave={handleSaveEditStation}
                                            onCancel={() => setEditingStation(null)}
                                        />
                                    ) : (
                                        <>
                                            <div className="station-header">
                                                <h3>{station.name}</h3>
                                                <div className="station-actions">
                                                    <button
                                                        onClick={() => handleEditStation(station)}
                                                        className="btn-icon edit"
                                                        title="Editar posto"
                                                    >
                                                        ✏️
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteStation(station)}
                                                        className="btn-icon delete"
                                                        title="Deletar posto"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            </div>
                                            <p>{station.address}</p>
                                            <p>Distância: {station.distance.toFixed(2)} km</p>

                                            <PriceList stationId={station.id} />

                                            {showingPriceForm === station.id ? (
                                                <div className="price-form-container">
                                                    <div className="price-form-header">
                                                        <h4>Reportar Preço</h4>
                                                        <button
                                                            onClick={handleHidePriceForm}
                                                            className="btn-close"
                                                            title="Fechar formulário"
                                                        >
                                                            ❌
                                                        </button>
                                                    </div>
                                                    <PriceFormModal
                                                        stationId={station.id}
                                                        onPriceAdded={handlePriceAdded}
                                                    />
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleShowPriceForm(station.id)}
                                                    className="report-price-btn"
                                                >
                                                    📝 Reportar Preço
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))}

                    {/* Marker para novo posto */}
                    {newStationPosition && (
                        <Marker
                            position={[newStationPosition.lat, newStationPosition.lng]}
                            icon={newStationIcon}
                        >
                            <Popup maxWidth={400} className="station-popup">
                                <NewStationForm
                                    position={newStationPosition}
                                    onSave={handleSaveNewStation}
                                    onCancel={handleCancelNewStation}
                                />
                            </Popup>
                        </Marker>
                    )}
                </MapContainer>
            </div>

            {/* Modal de formulário de preços */}
            <PriceFormModal
                stationId={selectedStation?.id}
                stationName={selectedStation?.name}
                visible={showingPriceForm !== null}
                onClose={handleHidePriceForm}
                onPriceAdded={handlePriceAdded}
            />
        </div>
    );
}

export default App;