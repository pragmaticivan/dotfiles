package notifications

import (
	"context"
	"errors"
	"testing"
	"time"
)

type scriptedSMS struct {
	statuses []int
	calls    int
}

func (p *scriptedSMS) Post(ctx context.Context, to, text string) (int, error) {
	s := p.statuses[p.calls]
	p.calls++
	return s, nil
}

type failingSMTP struct{ calls int }

func (c *failingSMTP) SendMail(ctx context.Context, to, subject, body string) (int, error) {
	c.calls++
	return 0, errors.New("connection reset")
}

func newTestDispatcher(chs ...Channel) (*Dispatcher, *[]time.Duration) {
	var slept []time.Duration
	d := NewDispatcher(chs...)
	d.Sleep = func(t time.Duration) { slept = append(slept, t) }
	return d, &slept
}

func TestRetriesThenSucceeds(t *testing.T) {
	p := &scriptedSMS{statuses: []int{503, 429, 200}}
	d, slept := newTestDispatcher(&SMSChannel{Provider: p})
	d.Enqueue("sms", Message{ID: "m1"})
	d.Drain(context.Background())
	if p.calls != 3 || len(d.DeadLetters) != 0 {
		t.Fatalf("calls=%d dead=%d", p.calls, len(d.DeadLetters))
	}
	want := []time.Duration{200 * time.Millisecond, 400 * time.Millisecond}
	if len(*slept) != 2 || (*slept)[0] != want[0] || (*slept)[1] != want[1] {
		t.Fatalf("backoff = %v, want %v", *slept, want)
	}
}

func TestTerminalGoesStraightToDeadLetters(t *testing.T) {
	p := &scriptedSMS{statuses: []int{400}}
	d, _ := newTestDispatcher(&SMSChannel{Provider: p})
	d.Enqueue("sms", Message{ID: "m2"})
	d.Drain(context.Background())
	if p.calls != 1 || len(d.DeadLetters) != 1 {
		t.Fatalf("calls=%d dead=%d", p.calls, len(d.DeadLetters))
	}
}

func TestPlainErrorIsRetriedUntilMaxAttempts(t *testing.T) {
	c := &failingSMTP{}
	d, _ := newTestDispatcher(&EmailChannel{Client: c})
	d.Enqueue("email", Message{ID: "m3"})
	d.Drain(context.Background())
	if c.calls != 5 || len(d.DeadLetters) != 1 {
		t.Fatalf("calls=%d dead=%d", c.calls, len(d.DeadLetters))
	}
}
