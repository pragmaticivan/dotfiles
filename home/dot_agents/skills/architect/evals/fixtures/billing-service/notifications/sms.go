package notifications

import (
	"context"
	"fmt"
)

type SMSProvider interface {
	Post(ctx context.Context, to, text string) (status int, err error)
}

type SMSChannel struct {
	Provider SMSProvider
}

func (c *SMSChannel) Name() string { return "sms" }

func (c *SMSChannel) Send(ctx context.Context, msg Message) error {
	status, err := c.Provider.Post(ctx, msg.Recipient, msg.Body)
	if err != nil {
		return err
	}
	switch {
	case status >= 200 && status < 300:
		return nil
	case status == 429 || status >= 500:
		return &SendError{Channel: c.Name(), Retryable: true, Err: fmt.Errorf("provider status %d", status)}
	default:
		return &SendError{Channel: c.Name(), Retryable: false, Err: fmt.Errorf("provider status %d", status)}
	}
}
