import { RankingAdapter } from '../tasks/RankingAdapter';
import * as d3 from 'd3';
import 'd3.parsets/d3.parsets';
import 'd3-grubert-boxplot/box';
import { PanelTab } from 'tdp_core/dist/lineup/internal/panel/PanelTab';
import { RowComparison } from '../tasks/RowComparisonTask';
import { ColumnComparison } from '../tasks/ColumnComparisonTask';
export const tasks = [
    new RowComparison(),
    new ColumnComparison(),
].sort((a, b) => b.order - a.order); // sort descending
const touringTemplate = `
<p class="touring-intro-text">
  This panel allows you to perform basic statistical analyses. You can either compare multiple columns (e.g., are the values of column A correlated with the values of column B?)
  or compare sets of rows (e.g., does row set 1 differ from row set 2 with respect to the values in column C?).
</p>
<div class="alert alert-warning" role="alert">
  <strong>Please note:</strong> This panel is still under development. Please report any problems you might observe. Furthermore, there is currently no multiple-testing correction being performed.
</div>
<div class="input">
  <div class="type form-horizontal"> <!-- https://getbootstrap.com/docs/3.3/css/#forms-horizontal -->
    <div class="row">
      <label class="col-sm-4 col-form-label" style="padding-top: 0.5em;">What do you want to compare?</label> <!-- 1em top padding to center vertically-->
      <div class="btn-group col-sm-8 btn-wrapper" role="group" aria-label="Basic radio toggle button group">
      </div>
    </div>
  </div>
</div>

<div class="output"></div> <!-- task output -->`;
export class TouringPanel {
    constructor(_desc, tab, provider) {
        this._desc = _desc;
        this.tab = tab;
        this.provider = provider;
        this.node = tab.node;
        this.node.classList.add('touring');
        this.node.innerHTML = touringTemplate;
        this.init();
    }
    init() {
        this.ranking = new RankingAdapter(this.provider);
        this.initTasks();
        this.insertTasks();
        this.addEventListeners();
        this.updateTask();
    }
    initTasks() {
        for (const task of tasks) {
            task.init(this.ranking, d3.select(this.node).select('div.output').node());
        }
    }
    insertTasks() {
        // For each Task, create a button
        // Link tasks with buttons
        const taskSelectForm = d3.select(this.node).select('.input .type .row .btn-group');
        const taskButtons = taskSelectForm.selectAll('.btn-wrapper').data(tasks, (task) => task.id);
        // TODO: Add in correct order and fix styling of selected button
        taskButtons.enter() // enter: add a button for each task
            .append('input').attr('class', `btn-check task-btn`).attr('type', 'radio').attr('id', (d, i) => `btnradio_${i}`).attr('checked', (d, i) => i === 0)
            .classed('active', (d, i) => i === 0); // Activate first task
        taskButtons.enter() // enter: add a button for each task
            .append('label').attr('class', `btn btn-outline-secondary`).attr('for', (d, i) => `btnradio_${i}`)
            .html((d) => `<img src="${d.icon}" style="height:70%" /> &nbsp;${d.label}`);
        // update: nothing to do
        taskButtons.exit().remove(); // exit: remove tasks no longer displayed
        taskButtons.order(); // order domelements as in the array
    }
    addEventListeners() {
        this.tab.on(PanelTab.SHOW_PANEL, () => {
            if (this.active === true) {
                return; // do not update tasks when clicking on open touring button and touring panel is already open
            }
            this.updateOutput(true); // update tasks when panel opens
            this.active = true;
            this.currentTask.addEventListeners();
        });
        this.tab.on(PanelTab.HIDE_PANEL, () => {
            this.active = false;
            this.currentTask.removeEventListeners();
        });
        // Click a different task
        d3.select(this.node).selectAll('input.task-btn').on('click', (task) => {
            const taskButtons = d3.select(this.node).selectAll('input.task-btn');
            if (this.currentTask && this.currentTask.id !== task.id) { // task changed
                taskButtons.classed('active', (d) => d.id === task.id);
                taskButtons.attr('checked', (d) => d.id === task.id);
                this.currentTask.hide(); // hide old task
                this.updateOutput(); // will show new task
            }
        });
    }
    async updateOutput(forceUpdate) {
        if (this.active || forceUpdate) {
            await setTimeout(() => this.updateTask(), 0);
        }
        else {
            console.log('Touring Panel is hidden, skip update.');
        }
    }
    updateTask() {
        const activeButton = d3.select(this.node).select('input.task-btn.active');
        if (activeButton.size() === 0) {
            console.warn('No comparison tasks registered and found.');
            return;
        }
        this.currentTask = activeButton.datum();
        this.currentTask.show();
    }
    /**
     *
     * @param tab PanelTab
     * @param provider Instance of the LocalDataProvider that contains all ranking
     * @param desc Options provided through the extension point i.e `headerCssClass, headerTitle`
     */
    static create(desc, tab, provider) {
        // tslint:disable-next-line:no-unused-expression
        new TouringPanel(desc, tab, provider);
    }
}
//# sourceMappingURL=TouringPanel.js.map