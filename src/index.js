const Rx = require('rx-lite')

class ReactiveProperty {
    constructor(state, name, initialValue) {
        this.subject = new Rx.BehaviorSubject(initialValue);
        this.changed = this.subject.skip(1);

        Object.defineProperty(state, name, {
            get: () => {
                return this.subject.getValue();
            },
            set: (val) => {
                return this.subject.onNext(val);
            }
        });
    }
}

class ComputedProperty {
    constructor(store, name, dependencies, getter) {
        this.subject = new Rx.BehaviorSubject(getter(store));
        this.changed = this.subject.skip(1);

        Rx.Observable.combineLatest.apply(null, dependencies.map(function (dep) {
            return dep.subject;
        })).subscribe(() => {
            this.subject.onNext(getter(store.state));
        });

        Object.defineProperty(store.computed, name, {
            get: () => {
                return this.subject.getValue();
            }
        });
    }
}

class Store {
    constructor(options) {
        this.state = {};
        this.computed = {};
        this._actions = options.actions;
        this._mutations = options.mutations;

        this._properties = {};

        for (let name in options.state) {
            this._properties[name] = new ReactiveProperty(this.state, name, options.state[name]);
        }

        for (let name in options.computed) {
            let computed = options.computed[name];
            let dependencies = computed.splice(0, computed.length - 1).map((name) => {
                return this._properties[name];
            });
            let getter = computed[computed.length - 1];
            this._properties[name] = new ComputedProperty(this, name, dependencies, getter);
        }
    }
    dispatch(action, payload) {
        return new Promise(() => {
            return this._actions[action].call(this, {
                commit: this.commit.bind(this),
                state: this.state
            }, payload)
        });
    }
    commit(mutation, payload) {
        return this._mutations[mutation].call(this, this.state, payload);
    }
    watch(name, callback) {
        return this._properties[name].changed.subscribe(function (val) {
            callback(val);
        });
    }
}

const store = new Store({
    state: {
        firstName: 'John',
        lastName: 'Smith',
        amount: 10
    },
    computed: {
        fullName: ['firstName', 'lastName', function (state) {
            return state.firstName + ' ' + state.lastName;
        }]
    },
    actions: {
        increment: function (context) {
            return new Promise(function (resolve) {
                setTimeout(function () {
                    context.commit('increment');
                    resolve();
                }, 1000);
            });
        }
    },
    mutations: {
        increment: function (state) {
            state.amount += 1;
        }
    },
});

store.watch('firstName', function (name) {
    console.log('firstName changed:', name);
});

console.log(store.computed.fullName); // John Smith
store.state.firstName = 'Bob';
console.log(store.computed.fullName); // Bob Smith

console.log(store.state.amount); // 10
store.commit('increment');
console.log(store.state.amount); // 11

process.on('exit', () => {
    console.log(store.state.amount); // 12
});

store.dispatch('increment');