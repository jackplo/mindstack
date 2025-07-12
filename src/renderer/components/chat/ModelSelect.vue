<template>
  <div class="model-select">
    <cur-select
      description=""
      :value="selectedModel"
      :options="modelOptions"
      :onChange="value => onSelectChange(value)"
      :disable="false"
    ></cur-select>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import CurSelect from '../../prefComponents/common/select'

export default {
  name: 'ModelSelect',
  components: {
    CurSelect
  },
  data () {
    return {
      modelOptions: [
        { label: 'GPT-4o', value: 'gpt-4o' },
        { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
        { label: 'GPT-4 Turbo', value: 'gpt-4-turbo' },
        { label: 'GPT-4.1 Nano', value: 'gpt-4.1-nano' }
      ]
    }
  },
  computed: {
    ...mapState({
      openaiModel: state => state.preferences.openaiModel
    }),
    selectedModel () {
      return this.openaiModel || 'None'
    }
  },
  methods: {
    onSelectChange (value) {
      this.$store.dispatch('SET_SINGLE_PREFERENCE', {
        type: 'openaiModel',
        value: value
      })
    }
  }
}
</script>

<style scoped>
.model-select {
  height: fit-content;
  justify-self: start;
  & > section {
    margin: 0 !important;
  }
}
</style>
