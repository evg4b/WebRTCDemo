package hub

import "github.com/gorilla/websocket"

// Hub hub structure
type Hub struct {
	clients    map[*client]bool
	broadcast  chan message
	register   chan *client
	unregister chan *client
}

// Run run WebSocket hub
func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}
		case message := <-h.broadcast:
			for client := range h.clients {
				if client != message.client {
					select {
					case client.send <- message.data:
					default:
						close(client.send)
						delete(h.clients, client)
					}
				}

			}
		}
	}
}

// Register regisster
func (h *Hub) Register(connection *websocket.Conn, wsHub *Hub) {
	client := &client{
		hub:        wsHub,
		connection: connection,
		send:       make(chan []byte, 256),
	}

	go client.writePump()
	go client.readPump()

	h.register <- client
}

// NewHub create new hub
func NewHub() *Hub {
	return &Hub{
		broadcast:  make(chan message),
		register:   make(chan *client),
		unregister: make(chan *client),
		clients:    make(map[*client]bool),
	}
}
