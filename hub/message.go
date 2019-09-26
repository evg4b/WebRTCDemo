package hub

type message struct {
	client *client
	data   []byte
}
