package notifications

import (
	"context"
	"errors"
	"time"
)

type job struct {
	channel string
	msg     Message
	attempt int
}

type Dispatcher struct {
	channels    map[string]Channel
	queue       []job
	MaxAttempts int
	BaseDelay   time.Duration
	Sleep       func(time.Duration)
	DeadLetters []Message
}

func NewDispatcher(channels ...Channel) *Dispatcher {
	d := &Dispatcher{
		channels:    map[string]Channel{},
		MaxAttempts: 5,
		BaseDelay:   200 * time.Millisecond,
		Sleep:       time.Sleep,
	}
	for _, c := range channels {
		d.channels[c.Name()] = c
	}
	return d
}

func (d *Dispatcher) Enqueue(channel string, msg Message) {
	d.queue = append(d.queue, job{channel: channel, msg: msg})
}

// Drain sends every queued job. A failed job goes back on the queue after
// BaseDelay * 2^attempt, until MaxAttempts or a non-retryable SendError.
func (d *Dispatcher) Drain(ctx context.Context) {
	for len(d.queue) > 0 {
		j := d.queue[0]
		d.queue = d.queue[1:]

		ch, ok := d.channels[j.channel]
		if !ok {
			d.DeadLetters = append(d.DeadLetters, j.msg)
			continue
		}
		err := ch.Send(ctx, j.msg)
		if err == nil {
			continue
		}
		j.attempt++
		if !retryable(err) || j.attempt >= d.MaxAttempts {
			d.DeadLetters = append(d.DeadLetters, j.msg)
			continue
		}
		d.Sleep(d.BaseDelay << (j.attempt - 1))
		d.queue = append(d.queue, j)
	}
}

func retryable(err error) bool {
	var se *SendError
	if errors.As(err, &se) {
		return se.Retryable
	}
	return true
}
