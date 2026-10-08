package notifications

import (
	"context"
	"fmt"
)

type Message struct {
	ID        string
	Recipient string
	Subject   string
	Body      string
}

type Channel interface {
	Name() string
	Send(ctx context.Context, msg Message) error
}

// SendError is the only way a channel tells the dispatcher a failure is
// terminal. Any other error value is treated as retryable.
type SendError struct {
	Channel   string
	Retryable bool
	Err       error
}

func (e *SendError) Error() string {
	return fmt.Sprintf("%s: %v (retryable=%t)", e.Channel, e.Err, e.Retryable)
}

func (e *SendError) Unwrap() error { return e.Err }
