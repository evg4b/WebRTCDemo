package main

import (
	"log"
	"net/http"
	"sync"
)

func main() {
	var wg sync.WaitGroup
	wg.Add(1)
	go fileServer(&wg)
	wg.Wait()
}

func fileServer(wg *sync.WaitGroup) {
	defer wg.Done()
	port := "8010"
	directory := "./webroot"
	http.Handle("/", http.FileServer(http.Dir(directory)))
	log.Printf("Serving %s on HTTP port: %s\n", directory, port)
	log.Fatal(http.ListenAndServe(":"+port, nil))
}
