package notifications

import (
	"context"
	"fmt"
)

type SMTPClient interface {
	SendMail(ctx context.Context, to, subject, body string) (code int, err error)
}

type EmailChannel struct {
	Client SMTPClient
}

func (c *EmailChannel) Name() string { return "email" }

func (c *EmailChannel) Send(ctx context.Context, msg Message) error {
	code, err := c.Client.SendMail(ctx, msg.Recipient, msg.Subject, msg.Body)
	if err != nil {
		return err
	}
	switch {
	case code >= 200 && code < 300:
		return nil
	case code >= 400 && code < 500:
		return &SendError{Channel: c.Name(), Retryable: true, Err: fmt.Errorf("smtp transient %d", code)}
	default:
		return &SendError{Channel: c.Name(), Retryable: false, Err: fmt.Errorf("smtp permanent %d", code)}
	}
}
