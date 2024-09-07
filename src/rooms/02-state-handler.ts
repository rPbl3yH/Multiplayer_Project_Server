import { Room, Client } from "colyseus";
import { Schema, type, MapSchema } from "@colyseus/schema";

export class Player extends Schema {
    @type("int8")
    skinIndex = 0;

    @type("int16")
    maxHp = 0;

    @type("int16")
    hp = 0;

    @type("uint16")
    loss = 0;

    @type("number")
    speed1 = 0;

    @type("number")
    pX = 0;

    @type("number")
    pY = 0;

    @type("number")
    pZ = 0;

    @type("number")
    vX = 0;

    @type("number")
    vY = 0;

    @type("number")
    vZ = 0;

    @type("number")
    rX = 0;

    @type("number")
    rY = 0;
}

export class State extends Schema {
    @type({ map: Player })
    players = new MapSchema<Player>();

    something = "This attribute won't be sent to the client-side";

    createPlayer(sessionId: string, data: any, skin: number) {
        const player = new Player();
        player.speed = data.speed;
        player.maxHp = data.maxHp;
        player.hp = data.maxHp;
        player.skinIndex = skin;

        player.pX = data.pX;
        player.pY = data.pY;
        player.pZ = data.pZ;

        player.rY = data.rY;

        this.players.set(sessionId, player);
    }

    removePlayer(sessionId: string) {
        this.players.delete(sessionId);
    }

    movePlayer (sessionId: string, data: any) {
        const player = this.players.get(sessionId);

        player.pX = data.pX;
        player.pY = data.pY;
        player.pZ  = data.pZ;

        player.vX = data.vX;
        player.vY = data.vY;
        player.vZ  = data.vZ;
    
        player.rX = data.rX;
        player.rY = data.rY;
    }
}

export class StateHandlerRoom extends Room<State> {
    maxClients = 2;
    pointsLength = 0;
    skins: number[] = [];

    onCreate (options) {
        console.log("StateHandlerRoom created!", options);
        this.pointsLength = options.pointsLength;

        for (let index = 0; index < options.skins; index++) {
            this.skins.push(index);
        }

        this.setState(new State());

        this.onMessage("move", (client, data) => {
            // console.log("StateHandlerRoom received message from", client.sessionId, ":", data);
            this.state.movePlayer(client.sessionId, data);
        });

        this.onMessage("shoot", (client, data) => {
            this.broadcast("Shoot", data, {except: client});
        })

        this.onMessage("damage", (client, data) => {
            const clientId = data.id;
            const player = this.state.players.get(clientId);

            let hp = player.hp - data.value;
            
            if(hp > 0){
                player.hp = hp;
                return;
            }

            player.loss++;
            player.hp = player.maxHp;
            
            for (let i = 0; i < this.clients.length; i++) {
                const otherClient = this.clients[i];
                
                if(otherClient.id != clientId){
                    continue;
                }

                const pointIndex = Math.floor(Math.random() * this.pointsLength);
                otherClient.send("Restart", pointIndex);
            }
        })
    }

    onAuth(client, options, req) {
        return true;
    }

    onJoin (client: Client, data: any) {
        if(this.clients.length > 1){
            this.lock();
        }

        const skin = ArrayUtils.shuffleArray(this.skins)[0];
                
        this.state.createPlayer(client.sessionId, data, skin);
    }

    onLeave (client) {
        this.state.removePlayer(client.sessionId);
    }

    onDispose () {
        console.log("Dispose StateHandlerRoom");
    }
}

class ArrayUtils {
    static shuffleArray<T>(array: T[]): T[] {
        const arrayCopy = [...array];
        
        for (let i = arrayCopy.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            
            [arrayCopy[i], arrayCopy[j]] = [arrayCopy[j], arrayCopy[i]];
        }
        
        return arrayCopy;
    }
}

