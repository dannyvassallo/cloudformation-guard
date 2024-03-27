# Container image that runs your code
FROM alpine:3.10

RUN apk add curl

COPY entrypoint.sh /entrypoint.sh

RUN chmod +x entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
