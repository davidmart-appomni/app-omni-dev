## Local setup (mac)

```sh

# setup sh
sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)"

# install homebrew
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# setup gcloud
brew install --cask google-cloud-sdk
gcloud auth login
gcloud auth application-default login

# cloud sql proxy setup
new install 
mkdir -p ~/dev/cloudsql
cloud-sql-proxy --unix-socket ~/dev/cloudsql INSTANCE_CONNECTION_NAME

# setup psql
brew install libpq
echo 'export PATH="/usr/local/opt/libpq/bin:$PATH"' >> ~/.zshrc

# connect
psql -h ~/dev/cloudsql/INSTANCE_CONNECTION_NAME -U USERNAME -d DB_NAME
```