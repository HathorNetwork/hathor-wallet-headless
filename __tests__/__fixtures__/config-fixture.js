const config = {
  http_bind_address: "fakehost",
  http_port: 8001,
  network: "testnet",
  server: "http://fakehost:8083/v1a/",
  seeds: {
    stub_seed:
      "upon tennis increase embark dismiss diamond monitor face magnet jungle scout salute rural master shoulder cry juice jeans radar present close meat antenna mind",
  },
  tokenUid: "",
  gapLimit: null,
  confirmFirstAddress: null,
};

// Allow change config at runtime
global.config = config;

export default config;