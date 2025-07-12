<template>
  <div class="pref-chat">
    <h4>Chat</h4>
    <compound>
      <template #head>
        <h6 class="title">Model Configuration:</h6>
      </template>
      <template #children>
        <text-box
          description="OpenAI API Key"
          :input="openaiApiKey"
          :regexValidator="/^sk-proj-[a-zA-Z0-9_-]{80,}$/"
          :onChange="value => onSelectChange('openaiApiKey', value)"
        ></text-box>
      </template>
    </compound>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import Compound from '../common/compound'
import TextBox from '../common/textBox'

export default {
  components: {
    Compound,
    TextBox
  },
  data () {
    return {}
  },
  computed: {
    ...mapState({
      openaiApiKey: state => state.preferences.openaiApiKey
    })
  },
  methods: {
    onSelectChange (type, value) {
      this.$store.dispatch('SET_SINGLE_PREFERENCE', { type, value })
    }
  }
}
</script>

<style scoped>

</style>
