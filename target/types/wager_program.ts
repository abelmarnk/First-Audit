/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/wager_program.json`.
 */
export type WagerProgram = {
  "address": "5Gm2UmBRA36mQrYcty2dopLL5rKzCHdgLMynXgiM7AbR",
  "metadata": {
    "name": "wagerProgram",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "createGameSession",
      "discriminator": [
        130,
        34,
        251,
        80,
        77,
        159,
        113,
        224
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "gameSession",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101,
                  95,
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "arg",
                "path": "args.session_id"
              }
            ]
          }
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "args.session_id"
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mint",
          "address": "6NSc7XKGkGUYczHqW3xa2Yftxr5n9iUtLwSQtvtGbxsX"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "createGameSessionArgs"
            }
          }
        }
      ]
    },
    {
      "name": "createGlobalState",
      "discriminator": [
        53,
        127,
        207,
        143,
        222,
        244,
        229,
        115
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "initializer",
          "signer": true,
          "address": "Ebyfu4HZyNm1zkfirVMHuD4r29bSmgofmy8uExwaLbgG"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "createGlobalConfigArgs"
            }
          }
        }
      ]
    },
    {
      "name": "distributePayToSpawnWinnings",
      "discriminator": [
        54,
        108,
        82,
        201,
        187,
        203,
        9,
        198
      ],
      "accounts": [
        {
          "name": "globalConfig"
        },
        {
          "name": "server",
          "writable": true,
          "signer": true
        },
        {
          "name": "creator",
          "docs": [
            "It may already be passed along with remaining accounts but is restated",
            "explictly here"
          ],
          "writable": true
        },
        {
          "name": "creatorTokenAccount",
          "docs": [
            "The creator's token account",
            "It may already be passed along with remaining accounts but is restated",
            "explictly here"
          ],
          "writable": true,
          "optional": true
        },
        {
          "name": "gameSession",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101,
                  95,
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "game_session.session_id",
                "account": "gameSession"
              }
            ]
          }
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "game_session.session_id",
                "account": "gameSession"
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "const",
                "value": [
                  79,
                  200,
                  149,
                  111,
                  17,
                  4,
                  205,
                  30,
                  223,
                  162,
                  161,
                  110,
                  57,
                  13,
                  78,
                  67,
                  36,
                  169,
                  71,
                  109,
                  16,
                  225,
                  237,
                  71,
                  185,
                  35,
                  99,
                  154,
                  121,
                  12,
                  14,
                  14
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": []
    },
    {
      "name": "distributeWinnings",
      "discriminator": [
        208,
        254,
        127,
        148,
        78,
        104,
        249,
        250
      ],
      "accounts": [
        {
          "name": "globalConfig"
        },
        {
          "name": "server",
          "writable": true,
          "signer": true
        },
        {
          "name": "creator",
          "docs": [
            "It may already be passed along with remaining accounts but is restated",
            "explictly here"
          ],
          "writable": true
        },
        {
          "name": "creatorTokenAccount",
          "docs": [
            "The creator's token account",
            "It may already be passed along with remaining accounts but is restated",
            "explictly here"
          ],
          "writable": true,
          "optional": true
        },
        {
          "name": "gameSession",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101,
                  95,
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "game_session.session_id",
                "account": "gameSession"
              }
            ]
          }
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "game_session.session_id",
                "account": "gameSession"
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "const",
                "value": [
                  79,
                  200,
                  149,
                  111,
                  17,
                  4,
                  205,
                  30,
                  223,
                  162,
                  161,
                  110,
                  57,
                  13,
                  78,
                  67,
                  36,
                  169,
                  71,
                  109,
                  16,
                  225,
                  237,
                  71,
                  185,
                  35,
                  99,
                  154,
                  121,
                  12,
                  14,
                  14
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "distributeWinningsArgs"
            }
          }
        }
      ]
    },
    {
      "name": "joinUser",
      "discriminator": [
        34,
        15,
        119,
        81,
        119,
        149,
        25,
        240
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "server",
          "signer": true
        },
        {
          "name": "globalConfig"
        },
        {
          "name": "gameSession",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101,
                  95,
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "game_session.session_id",
                "account": "gameSession"
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "game_session.session_id",
                "account": "gameSession"
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "const",
                "value": [
                  79,
                  200,
                  149,
                  111,
                  17,
                  4,
                  205,
                  30,
                  223,
                  162,
                  161,
                  110,
                  57,
                  13,
                  78,
                  67,
                  36,
                  169,
                  71,
                  109,
                  16,
                  225,
                  237,
                  71,
                  185,
                  35,
                  99,
                  154,
                  121,
                  12,
                  14,
                  14
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "mint",
          "address": "6NSc7XKGkGUYczHqW3xa2Yftxr5n9iUtLwSQtvtGbxsX"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "joinUserArgs"
            }
          }
        }
      ]
    },
    {
      "name": "payToSpawn",
      "discriminator": [
        55,
        158,
        177,
        30,
        46,
        243,
        227,
        129
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "gameSession",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101,
                  95,
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "game_session.session_id",
                "account": "gameSession"
              }
            ]
          }
        },
        {
          "name": "userTokenAccount",
          "writable": true
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "game_session.session_id",
                "account": "gameSession"
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "const",
                "value": [
                  79,
                  200,
                  149,
                  111,
                  17,
                  4,
                  205,
                  30,
                  223,
                  162,
                  161,
                  110,
                  57,
                  13,
                  78,
                  67,
                  36,
                  169,
                  71,
                  109,
                  16,
                  225,
                  237,
                  71,
                  185,
                  35,
                  99,
                  154,
                  121,
                  12,
                  14,
                  14
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "payToSpawnArgs"
            }
          }
        }
      ]
    },
    {
      "name": "recordKill",
      "discriminator": [
        199,
        67,
        232,
        200,
        144,
        122,
        230,
        56
      ],
      "accounts": [
        {
          "name": "gameSession",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101,
                  95,
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "game_session.session_id",
                "account": "gameSession"
              }
            ]
          }
        },
        {
          "name": "globalConfig"
        },
        {
          "name": "server",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "recordKillArgs"
            }
          }
        }
      ]
    },
    {
      "name": "refundWager",
      "discriminator": [
        208,
        62,
        96,
        78,
        126,
        46,
        251,
        157
      ],
      "accounts": [
        {
          "name": "server",
          "signer": true
        },
        {
          "name": "globalConfig"
        },
        {
          "name": "creator",
          "docs": [
            "It may already be passed along with remaining accounts but is stated",
            "explictly here"
          ],
          "writable": true
        },
        {
          "name": "gameSession",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  97,
                  109,
                  101,
                  95,
                  115,
                  101,
                  115,
                  115,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "game_session.session_id",
                "account": "gameSession"
              }
            ]
          }
        },
        {
          "name": "vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "game_session.session_id",
                "account": "gameSession"
              }
            ]
          }
        },
        {
          "name": "vaultTokenAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "vault"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "const",
                "value": [
                  79,
                  200,
                  149,
                  111,
                  17,
                  4,
                  205,
                  30,
                  223,
                  162,
                  161,
                  110,
                  57,
                  13,
                  78,
                  67,
                  36,
                  169,
                  71,
                  109,
                  16,
                  225,
                  237,
                  71,
                  185,
                  35,
                  99,
                  154,
                  121,
                  12,
                  14,
                  14
                ]
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "updateGlobalState",
      "discriminator": [
        72,
        50,
        207,
        20,
        119,
        37,
        44,
        182
      ],
      "accounts": [
        {
          "name": "globalConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  103,
                  108,
                  111,
                  98,
                  97,
                  108,
                  45,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "admin",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "updateGlobalConfigArgs"
            }
          }
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "gameSession",
      "discriminator": [
        150,
        116,
        20,
        197,
        205,
        121,
        220,
        240
      ]
    },
    {
      "name": "globalConfig",
      "discriminator": [
        149,
        8,
        156,
        202,
        160,
        252,
        176,
        217
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "invalidKillRecord",
      "msg": "Invalid kill record"
    },
    {
      "code": 6001,
      "name": "playerAlreadyInGame",
      "msg": "Player is already in the game"
    },
    {
      "code": 6002,
      "name": "invalidAuthority",
      "msg": "Invalid authority"
    },
    {
      "code": 6003,
      "name": "invalidInitializer",
      "msg": "Invalid authority"
    },
    {
      "code": 6004,
      "name": "invalidGameState",
      "msg": "Game session is not in the correct state"
    },
    {
      "code": 6005,
      "name": "invalidTeamSelection",
      "msg": "Invalid team selection. Team must be 0 or 1"
    },
    {
      "code": 6006,
      "name": "teamIsFull",
      "msg": "Team is already full"
    },
    {
      "code": 6007,
      "name": "insufficientFunds",
      "msg": "Insufficient funds to join the game"
    },
    {
      "code": 6008,
      "name": "invalidPlayerCount",
      "msg": "Invalid number of players for this game mode"
    },
    {
      "code": 6009,
      "name": "notAllPlayersJoined",
      "msg": "All players not joined"
    },
    {
      "code": 6010,
      "name": "gameNotCompleted",
      "msg": "Game is not in completed state"
    },
    {
      "code": 6011,
      "name": "unauthorizedDistribution",
      "msg": "Only the game authority can distribute winnings"
    },
    {
      "code": 6012,
      "name": "invalidWinningTeam",
      "msg": "Invalid winning team selection"
    },
    {
      "code": 6013,
      "name": "totalPotCalculationError",
      "msg": "Failed to calculate total pot due to arithmetic overflow"
    },
    {
      "code": 6014,
      "name": "noWinnersFound",
      "msg": "No winners found in the winning team"
    },
    {
      "code": 6015,
      "name": "winningsCalculationError",
      "msg": "Failed to calculate per-player winnings"
    },
    {
      "code": 6016,
      "name": "incompleteDistribution",
      "msg": "Failed to distribute all funds from game session"
    },
    {
      "code": 6017,
      "name": "invalidTeam",
      "msg": "Invalid team"
    },
    {
      "code": 6018,
      "name": "playerAccountNotFound",
      "msg": "Player account not found in winners"
    },
    {
      "code": 6019,
      "name": "invalidWinner",
      "msg": "Invalid winning team selection"
    },
    {
      "code": 6020,
      "name": "arithmeticError",
      "msg": "Arithmetic error"
    },
    {
      "code": 6021,
      "name": "invalidMint",
      "msg": "Invalid mint address provided"
    },
    {
      "code": 6022,
      "name": "invalidRemainingAccounts",
      "msg": "Invalid remaining accounts provided"
    },
    {
      "code": 6023,
      "name": "invalidWinnerTokenAccount",
      "msg": "Invalid winner token account owner"
    },
    {
      "code": 6024,
      "name": "invalidWinnerAccount",
      "msg": "Invalid winner account"
    },
    {
      "code": 6025,
      "name": "invalidTokenMint",
      "msg": "Invalid token mint"
    },
    {
      "code": 6026,
      "name": "invalidSpawns",
      "msg": "Invalid spawns"
    },
    {
      "code": 6027,
      "name": "unauthorizedKill",
      "msg": "Unauthorized kill"
    },
    {
      "code": 6028,
      "name": "unauthorizedPayToSpawn",
      "msg": "Unauthorized pay to spawn"
    },
    {
      "code": 6029,
      "name": "playerNotFound",
      "msg": "Player not found"
    },
    {
      "code": 6030,
      "name": "invalidPlayerTokenAccount",
      "msg": "Invalid player token account"
    },
    {
      "code": 6031,
      "name": "invalidPlayer",
      "msg": "Invalid player"
    },
    {
      "code": 6032,
      "name": "playerHasNoSpawns",
      "msg": "Player has no spawns"
    },
    {
      "code": 6033,
      "name": "gameNotInProgress",
      "msg": "Game is not in progress"
    },
    {
      "code": 6034,
      "name": "invalidSessionIdLength",
      "msg": "Invalid session ID length"
    },
    {
      "code": 6035,
      "name": "invalidCreatorAccount",
      "msg": "Invalid creator account"
    },
    {
      "code": 6036,
      "name": "invalidCreatorTokenAccount",
      "msg": "Invalid creator token account"
    },
    {
      "code": 6037,
      "name": "creatorTokenAccountNotProvided",
      "msg": "The creator token account was not provided"
    },
    {
      "code": 6038,
      "name": "gameInProgress",
      "msg": "The game is currently in progess all, players have joined"
    },
    {
      "code": 6039,
      "name": "playersNotSorted",
      "msg": "Players not sorted"
    },
    {
      "code": 6040,
      "name": "playersNotDistinct",
      "msg": "Players not distinct"
    },
    {
      "code": 6041,
      "name": "invalidWagerAmount",
      "msg": "Invalid Wager amount, it must be greater than 10 individual units of the token"
    }
  ],
  "types": [
    {
      "name": "createGameSessionArgs",
      "docs": [
        "Arguments for creating a new game session.",
        "- session_id: A unique identifier string for the game session.",
        "- wager_amount: The initial wager placed by each player.",
        "- game_mode: The selected mode of the game.",
        "- team: The team (0 for A, 1 for B) where the creator will be placed.",
        "- team_a: Initial players for Team A.",
        "- team_b: Initial players for Team B."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sessionId",
            "type": "string"
          },
          {
            "name": "wagerAmount",
            "type": "u64"
          },
          {
            "name": "gameMode",
            "type": {
              "defined": {
                "name": "gameMode"
              }
            }
          },
          {
            "name": "creatorTeam",
            "type": {
              "defined": {
                "name": "teamType"
              }
            }
          }
        ]
      }
    },
    {
      "name": "createGlobalConfigArgs",
      "docs": [
        "Arguments for creating the global state.",
        "- server: Pubkey of the admin/server authority."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "server",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "distributeWinningsArgs",
      "docs": [
        "Arguments for distributing winnings after a game sesson"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "winningTeam",
            "type": {
              "defined": {
                "name": "teamType"
              }
            }
          }
        ]
      }
    },
    {
      "name": "gameMode",
      "docs": [
        "Game mode defining the team sizes"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "winnerTakesAllOneVsOne"
          },
          {
            "name": "winnerTakesAllThreeVsThree"
          },
          {
            "name": "winnerTakesAllFiveVsFive"
          },
          {
            "name": "payToSpawnOneVsOne"
          },
          {
            "name": "payToSpawnThreeVsThree"
          },
          {
            "name": "payToSpawnFiveVsFive"
          }
        ]
      }
    },
    {
      "name": "gameSession",
      "docs": [
        "Represents a game session between teams with its own pool"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "sessionId",
            "type": "string"
          },
          {
            "name": "sessionWager",
            "type": "u64"
          },
          {
            "name": "gameMode",
            "type": {
              "defined": {
                "name": "gameMode"
              }
            }
          },
          {
            "name": "teamA",
            "type": {
              "defined": {
                "name": "team"
              }
            }
          },
          {
            "name": "teamB",
            "type": {
              "defined": {
                "name": "team"
              }
            }
          },
          {
            "name": "status",
            "type": {
              "defined": {
                "name": "gameStatus"
              }
            }
          },
          {
            "name": "createdAt",
            "type": "i64"
          },
          {
            "name": "creatorTeam",
            "type": {
              "defined": {
                "name": "teamType"
              }
            }
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "vaultBump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "gameStatus",
      "docs": [
        "Status of a game session"
      ],
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "waitingForPlayers"
          },
          {
            "name": "inProgress"
          },
          {
            "name": "completed"
          }
        ]
      }
    },
    {
      "name": "globalConfig",
      "docs": [
        "Account for storing the global state of the program"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "joinUserArgs",
      "docs": [
        "Arguments for joining a user to a game session.",
        "- team: The team (0 for A, 1 for B) the user wishes to join."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "team",
            "type": {
              "defined": {
                "name": "teamType"
              }
            }
          }
        ]
      }
    },
    {
      "name": "payToSpawnArgs",
      "docs": [
        "Arguments for paying to respawn.",
        "- team: The team (0 for A, 1 for B) the player belongs to.",
        "- index: The index where the player is in the team"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "team",
            "type": {
              "defined": {
                "name": "teamType"
              }
            }
          },
          {
            "name": "index",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "recordKillArgs",
      "docs": [
        "Arguments for recording a kill event.",
        "- killer_team: Team ID of the killer (0 = A, 1 = B).",
        "- killer: Pubkey of the killer.",
        "- victim_team: Team ID of the victim (0 = A, 1 = B).",
        "- victim: Pubkey of the victim."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "killerTeam",
            "type": {
              "defined": {
                "name": "teamType"
              }
            }
          },
          {
            "name": "killerIndex",
            "type": "u8"
          },
          {
            "name": "killer",
            "type": "pubkey"
          },
          {
            "name": "victimTeam",
            "type": {
              "defined": {
                "name": "teamType"
              }
            }
          },
          {
            "name": "victimIndex",
            "type": "u8"
          },
          {
            "name": "victim",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "team",
      "docs": [
        "Represents a team in the game"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "players",
            "type": {
              "array": [
                "pubkey",
                5
              ]
            }
          },
          {
            "name": "playerSpawnsRemaining",
            "type": {
              "array": [
                "u16",
                5
              ]
            }
          },
          {
            "name": "playerKills",
            "type": {
              "array": [
                "u16",
                5
              ]
            }
          },
          {
            "name": "playersTotalSpawnsAdditions",
            "type": {
              "array": [
                "u16",
                5
              ]
            }
          },
          {
            "name": "playerCount",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "teamType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "teamA"
          },
          {
            "name": "teamB"
          }
        ]
      }
    },
    {
      "name": "updateGlobalConfigArgs",
      "docs": [
        "Arguments for updating the global state.",
        "- new_server: New admin/server authority pubkey."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          }
        ]
      }
    }
  ]
};
