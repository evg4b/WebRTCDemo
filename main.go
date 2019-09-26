package main

import (
	"log"
	"net/http"

	"github.com/evg4b/WebRTCDemo/hub"
	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

func main() {
	port := "8010"
	directory := "./webroot"

	wsHub := hub.NewHub()
	go wsHub.Run()

	http.Handle("/", http.FileServer(http.Dir(directory)))
	http.HandleFunc("/ws", func(writer http.ResponseWriter, request *http.Request) {
		upgrader.CheckOrigin = func(r *http.Request) bool { return true }
		conn, err := upgrader.Upgrade(writer, request, nil)
		if err != nil {
			log.Println(err)
			return
		}
		wsHub.Register(conn, wsHub)
	})
	log.Printf("Serving %s on HTTP port: %s\n", directory, port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
