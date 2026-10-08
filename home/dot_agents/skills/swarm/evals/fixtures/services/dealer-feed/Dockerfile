FROM docker.internal/build:go1.26 AS build
WORKDIR /src
COPY . .
RUN go build -o /out/dealer-feed .

FROM docker.internal/base:legacy
COPY --from=build /out/dealer-feed /usr/local/bin/dealer-feed
CMD ["dealer-feed"]
