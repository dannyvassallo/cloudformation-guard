FROM rust:latest

SHELL ["/bin/bash", "-c"]
ENV NODE_VERSION=20.9.0
ENV NVM_DIR=/root/.nvm

RUN apt-get update
RUN apt-get install zsh curl python3 python3-pip python3-full -y
RUN wget https://github.com/robbyrussell/oh-my-zsh/raw/master/tools/install.sh -O - | zsh || true

COPY .bashrc /root/.bashrc
RUN bash -c "source ~/.bashrc"

COPY .zshrc /root/.zshrc
RUN zsh -c "source ~/.zshrc"

RUN curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
RUN . "$NVM_DIR/nvm.sh" && nvm install ${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm use v${NODE_VERSION}
RUN . "$NVM_DIR/nvm.sh" && nvm alias default v${NODE_VERSION}
ENV PATH="/root/.nvm/versions/node/v${NODE_VERSION}/bin/:${PATH}"

RUN node --version
RUN npm --version
RUN rustc --version
RUN cargo --version
RUN python3 --version

RUN cargo install cargo-nextest

RUN python3 -m venv venv
RUN source ./venv/bin/activate
# # RUN python3 -m pip install -r requirements-dev.txt

# RUN npm --prefix ./action install

# RUN npm --prefix ./guard install