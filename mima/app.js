
let valueNames = ["perspective", "mouth", "eyeFuzz", "agitation", "speed", "volume", "rainbow", "opacity", "hue"]

let settings = {
	volume: .5,
	speed:1,
	transitionSpeed: .1,

}

let app = {
	devMode: true,
	time: {},
	blackboard: undefined,
	face: new Face(),

	valueTracker: {},
	values: {
	},


	// Animate the face speaking and play sounds
	speakWords(output, progress) {

		
		let words = output.split(" ")
	
		let start = new Promise((resolve) => {
			setTimeout(() => {
				resolve()
			}, 0)
		})
		words.forEach((word,index) => {
			start = start.then(() => {
				return new Promise((resolve) => {
					let wordLength = word.length*40 + 100

					// Elongate the last word a bit
					if (index === words.length - 1)
						wordLength *= 1.8


					// Resolve when the word is done
					setTimeout(() => {
						randomChirp(wordLength)
						app.face.setWord(word, wordLength)
						resolve()
					}, wordLength)
			
				}) 
			})
		})
		return start
		
	},

	instance: new Chancery({
		map:testMimaMap, 
		metadata:{title:"mima"}, 
		onOutput: ({output, progress}) => {
			console.log("OUTPUT", output)
				
			app.messages.push({
				owner: "bot",
				text: [output]
			})
			return app.speakWords(output, progress)	
		
		},
		onChips: (chips) => {
			console.warn(chips)
			app.chips = chips
		},
		transitionSpeed: settings.transitionSpeed
	}),

	messages: [],
	chips: [],
	initUI() {
		// Put the ui in places
		document.onkeypress = () => {
			initSounds()
		}

		new Vue({
			template: `<div class="main-section" v-if="app.devMode">
				DEV TOOLS
				<button @click="app.start()">RESTART</button>
				<chancery-statemap :instance="app.instance" :app="app" />
				<chancery-exitmap :instance="app.instance" :app="app" />
			</div>`,	
			el: '#dev0',
			data: {app:app}
		})

		new Vue({
			template: `<div class="main-section" v-if="app.devMode">
				DEV TOOLS
				<chancery-actionqueue :instance="app.instance" :app="app" />
				<blackboard-view :blackboard="app.blackboard" />
			</div>`,	
			el: '#dev1',
			data: {app:app}
		})
	},

	start() {
		// Clear any existing loop
		clearInterval(this.tickInterval)

		this.instance.start()
		this.tickInterval = setInterval(() => {
			this.instance.tick()
		}, 100) 
	},

	userInput(data) {
		let msg = {
			owner: "user",
			text: [data]
		}
		
		// Send it to the chat
		app.messages.push(msg)

		// Send it to the chancery instance
		app.instance.input(msg)
	},

	init() {
		
		valueNames.forEach((name) => {
			this.valueTracker[name] = new LerpValue()
			this.values[name] = 0
		})

		this.blackboard = this.instance.blackboard
		this.blackboard.onModify((path, value) => {
			let key = path[0]
			if (app.valueTracker[key] !== undefined) {
				app.valueTracker[key].set(value, app.time.current, .5)
			}	
		
		})
			
		
		utilities.createProcessing({
			element:"bot", 
			onUpdate: t => {
				valueNames.forEach(key => {
					app.values[key] = app.valueTracker[key].get(t.current)
					// console.log(key, app.values[key])
				})

				
				app.face.update(t)
				
			}, 
			onDraw: (g, t) => {
				
				if (t.frame <= 1000000) {
					g.fill(0, 0, 0, .3*(1/(this.values.speed + 1)))
					g.rect(-g.width/2, -g.height/2, g.width, g.height)
					app.face.draw(g, t)
				}
			}, 
			onStart: (g, t) => {
				app.time = t

			}
		}); 

		app.initUI()

		if (!app.devMode)
			app.start()

	}
}


app.init()



new Vue({
	template: `
	
	<chat-window :messages="app.messages" :chips="app.chips" @sendInput='app.userInput' />
	`,	
	el: '#chat',
	methods: {

	},
	data: {
		app:app
	}

})