package main

import (
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"sync"
	"time"

	"github.com/pion/logging"
	"github.com/pion/turn"
)

func main() {
	var wg sync.WaitGroup
	wg.Add(1)
	go fileServer(&wg)
	wg.Add(1)
	go stunServer(&wg)
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

func stunServer(wg *sync.WaitGroup) {
	defer wg.Done()

	addrs, err := net.InterfaceAddrs()
	if err != nil {
		os.Stderr.WriteString("Oops: " + err.Error() + "\n")
		os.Exit(1)
	}

	for _, a := range addrs {
		if ipnet, ok := a.(*net.IPNet); ok && !ipnet.IP.IsLoopback() {
			if ipnet.IP.To4() != nil {
				os.Stdout.WriteString(ipnet.IP.String() + "\n")
			}
		}
	}

	udpPort, err := strconv.Atoi("3478")
	if err != nil {
		log.Panic(err)
	}

	channelBindTimeout, _ := time.ParseDuration("30s")
	s := turn.NewServer(&turn.ServerConfig{
		// Realm:              realm,
		ChannelBindTimeout: channelBindTimeout,
		ListeningPort:      udpPort,
		LoggerFactory:      logging.NewDefaultLoggerFactory(),
		Software:           os.Getenv("SOFTWARE"),
	})

	err = s.Start()
	if err != nil {
		log.Panic(err)
	}

	for {
	}
}
